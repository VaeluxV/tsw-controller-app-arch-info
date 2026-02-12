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
	Hold          bool
	MaxChangeRate float64
}

type ApiController_Interacting_Control struct {
	Cancel context.CancelFunc
	Timer  *time.Timer
}

type ApiController_Interacting struct {
	mutex    sync.RWMutex
	controls map[string]ApiController_Interacting_Control
}

type ApiController struct {
	API            *tswapi.TSWAPI
	ControlChannel chan ApiController_Command
	interacting    ApiController_Interacting
}

func (c *ApiController_Command) ToString() string {
	return fmt.Sprintf("api_control_command:%s:%f", c.Controls, c.InputValue)
}

func (controller *ApiController) StartInteractingIfNotAlready(ctx context.Context, control string) error {
	controller.interacting.mutex.Lock()
	defer controller.interacting.mutex.Unlock()

	if interacting, is_interacting := controller.interacting.controls[control]; is_interacting {
		/* already interacting; reset timer */
		interacting.Timer.Reset(time.Second * 1)
		return nil
	}

	/* start interaction if not already */
	err := controller.API.SetInteracting(control, 1.0)
	if err != nil {
		logger.Logger.Error("could not start interacting", "control", control, "error", err)
		return err
	}

	logger.Logger.Debug("started interacting with", "control", control)
	childctx, childctxcancel := context.WithCancel(ctx)
	stop_interacting_timer := time.NewTimer(time.Second * 1)
	controller.interacting.controls[control] = ApiController_Interacting_Control{
		Cancel: childctxcancel,
		Timer:  stop_interacting_timer,
	}

	/* start go routine which will stop the interaction */
	go func() {
		defer stop_interacting_timer.Stop()
		select {
		case <-childctx.Done():
			return
		case <-stop_interacting_timer.C:
			if err := controller.API.SetInteracting(control, 0.0); err != nil {
				logger.Logger.Debug("could not stop interacting with", "control", control)
				stop_interacting_timer.Reset(time.Second * 1)
			} else {
				controller.interacting.mutex.Lock()
				delete(controller.interacting.controls, control)
				controller.interacting.mutex.Unlock()
				logger.Logger.Debug("\n\n\nstopped interacting with\n\n\n", "control", control)
			}
		}
	}()
	return nil
}

func (controller *ApiController) UpdateControlValue(ctx context.Context, control string, value float64) error {
	if err := controller.API.SetInputValue(control, value); err != nil {
		logger.Logger.Error("could not update value", "error", err)
		return err
	}

	return nil
}

func (controller *ApiController) ProcessControlCommand(ctx context.Context, command ApiController_Command) error {
	/* we're just silently ignoring this error here and starting from a default of 0.0f on failure which is acceptable in most cases */
	current_value, _ := controller.API.GetInputValue(command.Controls)
	target_value_diff := math.Abs(current_value - command.InputValue)
	if target_value_diff <= command.MaxChangeRate {
		/* if less than max change rate; change as-is */
		if !command.Hold {
			if err := controller.StartInteractingIfNotAlready(ctx, command.Controls); err != nil {
				return err
			}
		}
		return controller.UpdateControlValue(ctx, command.Controls, command.InputValue)
	} else {
		/* if not generate steps to reach the target value */
		num_steps := int(math.Ceil(target_value_diff / command.MaxChangeRate))
		for step := 1; step <= num_steps; step++ {
			if !command.Hold {
				if err := controller.StartInteractingIfNotAlready(ctx, command.Controls); err != nil {
					return err
				}
			}

			set_value := current_value
			if current_value < command.InputValue {
				set_value = math.Min(current_value+(float64(step)*command.MaxChangeRate), command.InputValue)
			} else {
				set_value = math.Max(current_value-(float64(step)*command.MaxChangeRate), command.InputValue)
			}
			if err := controller.UpdateControlValue(ctx, command.Controls, set_value); err != nil {
				return err
			}
		}
	}

	return nil
}

func (controller *ApiController) Run(ctx context.Context) func() {
	ctx_with_cancel, cancel := context.WithCancel(ctx)

	go func() {
		for {
			select {
			case <-ctx_with_cancel.Done():
				return
			case command := <-controller.ControlChannel:
				controller.ProcessControlCommand(ctx, command)
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
			controls: map[string]ApiController_Interacting_Control{},
		},
	}
	return &controller
}
