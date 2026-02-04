package profile_runner

import (
	"context"
	"fmt"
	"math"
	"sync"
	"time"
	"tsw_controller_app/logger"
	"tsw_controller_app/tswapi"
)

const API_CONTROLLER_QUEUE_BUFFER_SIZE = 32

type ApiController_Command struct {
	Controls      string
	InputValue    float64
	MaxChangeRate float64
}

type ApiController_Interacting struct {
	mutex    sync.RWMutex
	controls map[string]time.Time
}

type ApiController struct {
	API            *tswapi.TSWAPI
	ControlChannel chan ApiController_Command
	interacting    ApiController_Interacting
}

func (c *ApiController_Command) ToString() string {
	return fmt.Sprintf("api_control_command:%s:%f", c.Controls, c.InputValue)
}

func (controller *ApiController) UpdateControlValue(control string, value float64) (func(), error) {
	controller.interacting.mutex.Lock()
	if _, is_interacting := controller.interacting.controls[control]; is_interacting {
		err := controller.API.SetInteracting(control, 1.0)
		if err != nil {
			controller.interacting.mutex.Unlock()
			logger.Logger.Error("could not start interacting", "control", control, "error", err)
			return nil, err
		} else {
			logger.Logger.Debug("started interacting with", "control", control)
		}
	}
	controller.interacting.mutex.Unlock()

	interacting_ts := time.Now()
	controller.interacting.controls[control] = interacting_ts
	err := controller.API.SetInputValue(control, value)
	if err != nil {
		logger.Logger.Error("could not update value", "error", err)
		return nil, err
	}

	return func() {
		<-time.After(time.Millisecond * 500)
		controller.interacting.mutex.Lock()
		defer controller.interacting.mutex.Unlock()
		if ts, has_ts := controller.interacting.controls[control]; has_ts && ts.Equal(interacting_ts) {
			delete(controller.interacting.controls, control)
			err := controller.API.SetInteracting(control, 0.0)
			if err != nil {
				logger.Logger.Error("could not stop interacting", "control", control, "error", err)
			}
		}
	}, nil
}

func (controller *ApiController) Run(ctx context.Context) func() {
	ctx_with_cancel, cancel := context.WithCancel(ctx)

	go func() {
		for {
			select {
			case <-ctx_with_cancel.Done():
				return
			case command := <-controller.ControlChannel:
				go func() {
					current_value, _ := controller.API.GetInputValue(command.Controls)
					target_value_diff := math.Abs(current_value - command.InputValue)
					if target_value_diff <= command.MaxChangeRate {
						stop_interacting, err := controller.UpdateControlValue(command.Controls, command.InputValue)
						if err == nil {
							stop_interacting()
						}
					} else {
						num_steps := int(math.Ceil(target_value_diff / command.MaxChangeRate))
						for step := 1; step <= num_steps; step++ {
							set_value := current_value
							if current_value < command.InputValue {
								set_value = math.Min(current_value+(float64(step)*command.MaxChangeRate), command.InputValue)
							} else {
								set_value = math.Max(current_value-(float64(step)*command.MaxChangeRate), command.InputValue)
							}
							stop_interacting, err := controller.UpdateControlValue(command.Controls, set_value)
							if err == nil {
								go stop_interacting()
							}
						}
					}
				}()
			}
		}
	}()

	return cancel
}

func NewAPIController(twapi *tswapi.TSWAPI) *ApiController {
	controller := ApiController{
		API:            twapi,
		ControlChannel: make(chan ApiController_Command, API_CONTROLLER_QUEUE_BUFFER_SIZE),
		interacting: ApiController_Interacting{
			mutex:    sync.RWMutex{},
			controls: map[string]time.Time{},
		},
	}
	return &controller
}
