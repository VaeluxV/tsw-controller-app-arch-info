package profile_runner

import (
	"context"
	"fmt"
	"strings"
	"tsw_controller_app/tswconnector"
)

const DIRECT_CONTROLLER_QUEUE_BUFFER_SIZE = 32
const DIRECT_CONTROL_CONNECTOR_EVENT_NAME tswconnector.TSWConnector_Message_EventName = "direct_control"

type DirectController_Command struct {
	Controls      string
	InputValue    float64
	MaxChangeRate float64
	Flags         []string
}

type DirectController struct {
	Connector      tswconnector.TSWConnector
	ControlChannel chan DirectController_Command
}

func (command *DirectController_Command) ToSocketMessage() tswconnector.TSWConnector_Message {
	return tswconnector.TSWConnector_Message{
		EventName: DIRECT_CONTROL_CONNECTOR_EVENT_NAME,
		Properties: map[string]string{
			"controls":        command.Controls,
			"value":           fmt.Sprintf("%f", command.InputValue),
			"max_change_rate": fmt.Sprintf("%f", command.MaxChangeRate),
			"flags":           strings.Join(command.Flags, "|"),
		},
	}
}

func (controller *DirectController) Run(ctx context.Context) func() {
	ctx_with_cancel, cancel := context.WithCancel(ctx)

	go func() {
		for {
			select {
			case <-ctx_with_cancel.Done():
				return
			case command := <-controller.ControlChannel:
				controller.Connector.Send(command.ToSocketMessage())
			}
		}
	}()

	return cancel
}

func NewDirectController(connection tswconnector.TSWConnector) *DirectController {
	controller := DirectController{
		Connector:      connection,
		ControlChannel: make(chan DirectController_Command, DIRECT_CONTROLLER_QUEUE_BUFFER_SIZE),
	}
	return &controller
}
