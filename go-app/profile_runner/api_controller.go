package profile_runner

import (
	"context"
	"fmt"
	"sync"
	"time"
	"tsw_controller_app/logger"
	"tsw_controller_app/tswapi"
)

const API_CONTROLLER_QUEUE_BUFFER_SIZE = 32

type ApiController_Command struct {
	Controls   string
	InputValue float64
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
	defer controller.interacting.mutex.Unlock()

	if _, is_interacting := controller.interacting.controls[control]; is_interacting {
		err := controller.API.SetInteracting(control, 1.0)
		if err != nil {
			logger.Logger.Error("could not start interacting", "control", control)
			return nil, err
		} else {
			logger.Logger.Info("started interacting with", "control", control)
		}
	}

	interacting_ts := time.Now()
	controller.interacting.controls[control] = interacting_ts
	err := controller.API.SetInputValue(control, value)
	if err != nil {
		logger.Logger.Error("could not update valuw")
		return nil, err
	}

	var stop_interacting func()
	stop_interacting = func() {
		controller.interacting.mutex.Lock()
		defer controller.interacting.mutex.Unlock()
		<-time.After(time.Millisecond * 300)
		if ts, has_ts := controller.interacting.controls[control]; has_ts && ts.Equal(interacting_ts) {
			delete(controller.interacting.controls, control)
			err := controller.API.SetInteracting(control, 0.0)
			if err != nil {
				logger.Logger.Error("could not stop interacting", "control", control)
				stop_interacting() /* reschedule stop interacting on failure */
			} else {
				logger.Logger.Info("stopped interacting with", "control", control)
			}
		}
	}
	return stop_interacting, nil
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
					stop_interacting, err := controller.UpdateControlValue(command.Controls, command.InputValue)
					if err != nil {
						stop_interacting()
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
