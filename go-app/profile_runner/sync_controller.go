package profile_runner

import (
	"context"
	"strconv"
	"time"
	"tsw_controller_app/config"
	"tsw_controller_app/controller_mgr"
	"tsw_controller_app/map_utils"
	"tsw_controller_app/pubsub_utils"
	"tsw_controller_app/tswconnector"
)

const SYNC_CONTROL_VALUE_CONNECTOR_EVENT_NAME tswconnector.TSWConnector_Message_EventName = "sync_control_value"

type SyncController_ControlState struct {
	Identifier             string
	PropertyName           string
	CurrentValue           float64
	CurrentNormalizedValue float64
	TargetValue            float64
	/** [-1,0,1] -> decreasing, idle, increasing */
	Moving         int
	ControlProfile *config.Config_Controller_Profile_Control_Assignment_SyncControl
	SourceEvent    *controller_mgr.ControllerManager_Control_ChangeEvent
}

type SyncController struct {
	Connector                   tswconnector.TSWConnector
	ControlState                *map_utils.LockMap[string, SyncController_ControlState]
	ControlStateChangedChannels *pubsub_utils.PubSubSlice[SyncController_ControlState]
}

func (c *SyncController) UpdateControlStateMoving(identifier string, moving int) {
	if state, has_state := c.ControlState.Get(identifier); has_state {
		state.Moving = moving
		c.ControlState.Set(identifier, state)
	}
}

func (c *SyncController) UpdateControlStateTargetValue(identifier string, targetValue float64, profile *config.Config_Controller_Profile_Control_Assignment_SyncControl, event *controller_mgr.ControllerManager_Control_ChangeEvent) {
	state, has_state := c.ControlState.Get(identifier)
	if !has_state {
		state = SyncController_ControlState{
			Identifier:             identifier,
			TargetValue:            targetValue,
			CurrentValue:           0.0,
			CurrentNormalizedValue: 0.0,
			Moving:                 0,
			/* we don't have the property name yet at this point */
			PropertyName:   "",
			ControlProfile: profile,
			SourceEvent:    event,
		}
	}
	state.TargetValue = targetValue
	c.ControlState.Set(identifier, state)

	c.ControlStateChangedChannels.EmitTimeout(time.Second, state)
}

func (c *SyncController) Subscribe() (chan SyncController_ControlState, func()) {
	return c.ControlStateChangedChannels.Subscribe()
}

func (c *SyncController) Run(ctx context.Context) func() {
	ctx_with_cancel, cancel := context.WithCancel(ctx)

	go func() {
		incoming_channel, unsubscribe := c.Connector.Subscribe()
		defer unsubscribe()

		for {
			select {
			case <-ctx_with_cancel.Done():
				return
			case msg := <-incoming_channel:
				/* skip message if not sync_control message */
				if msg.EventName != SYNC_CONTROL_VALUE_CONNECTOR_EVENT_NAME {
					continue
				}

				control_state, has_control_state := c.ControlState.Get(msg.Properties["name"])
				if !has_control_state {
					control_state = SyncController_ControlState{
						Identifier:             msg.Properties["name"],
						PropertyName:           msg.Properties["property"],
						CurrentValue:           0.0,
						CurrentNormalizedValue: 0.0,
						TargetValue:            0.0,
						Moving:                 0,
					}
				}

				current_value, _ := strconv.ParseFloat(msg.Properties["value"], 64)
				current_normalized_value, _ := strconv.ParseFloat(msg.Properties["normalized_value"], 64)
				control_state.PropertyName = msg.Properties["property"]
				control_state.CurrentValue = current_value
				control_state.CurrentNormalizedValue = current_normalized_value
				c.ControlState.Set(msg.Properties["name"], control_state)
				c.ControlStateChangedChannels.EmitTimeout(time.Second, control_state)
			}
		}
	}()

	return cancel
}

func NewSyncController(connection tswconnector.TSWConnector) *SyncController {
	controller := SyncController{
		Connector:                   connection,
		ControlState:                map_utils.NewLockMap[string, SyncController_ControlState](),
		ControlStateChangedChannels: pubsub_utils.NewPubSubSlice[SyncController_ControlState](),
	}
	return &controller
}
