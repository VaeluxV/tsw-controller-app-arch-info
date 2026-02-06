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
		interacting.Timer.Reset(time.Millisecond * 500)
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
	stop_interacting_timer := time.NewTimer(time.Millisecond * 500)
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
				stop_interacting_timer.Reset(time.Millisecond * 500)
			} else {
				logger.Logger.Debug("stopped interacting with", "control", control)
			}
		}
	}()
	return nil
}

func (controller *ApiController) UpdateControlValue(ctx context.Context, control string, value float64) error {
	err := controller.StartInteractingIfNotAlready(ctx, control)
	if err != nil {
		return err
	}

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
		return controller.UpdateControlValue(ctx, command.Controls, command.InputValue)
	} else {
		/* if not generate steps to reach the target value */
		num_steps := int(math.Ceil(target_value_diff / command.MaxChangeRate))
		for step := 1; step <= num_steps; step++ {
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
