package controller_mgr

import (
	"context"
	"time"
	"tsw_controller_app/config"
	"tsw_controller_app/logger"
	"tsw_controller_app/map_utils"
	"tsw_controller_app/math_utils"
	"tsw_controller_app/pubsub_utils"
	"tsw_controller_app/sdl_mgr"

	"github.com/veandco/go-sdl2/sdl"
)

const DEFAULT_CHANNEL_BUFFER_SIZE = 50
const DIRECTION_CHANGE_THRESHOLD = 0.05

type JoystickUniqueID = string
type ControllerManager_RawEvent struct {
	Joystick *sdl_mgr.SDLMgr_Joystick
	Event    sdl.Event
}

type ControllerManager_Control_ChangeEvent struct {
	Joystick     *sdl_mgr.SDLMgr_Joystick
	Controller   *ControllerManager_ConfiguredController
	Control      ControllerManager_Controller_Control
	ControlName  string
	ControlState ControllerManager_Controller_ControlState
}

type ControllerManager_Control_JoyDevicesUpdated struct {
}

type ControllerManager_Controller_ControlState_DirectionChangeMarker struct {
	/* the actual direction of travel; -1 | 0 | 1 depending on the direction */
	Direction int8
	/* the value at which the direction changed */
	ChangeValue float64
}

type ControllerManager_Controller_ControlStateValues struct {
	/* the current value of the control state */
	Value float64
	/* the previous value of the control state */
	PreviousValue float64
	/* the value at which the control was initialized */
	InitialValue float64
}

type ControllerManager_Controller_ControlState struct {
	Direction ControllerManager_Controller_ControlState_DirectionChangeMarker
	/* the normalized value states are in 0-1 format */
	NormalizedValues ControllerManager_Controller_ControlStateValues
	/* the raw values are in their raw value format coming from sdl */
	RawValues ControllerManager_Controller_ControlStateValues
}

type ControllerManager_Controller_Control interface {
	UpdateValue(value float64, is_reset bool)
	GetState() ControllerManager_Controller_ControlState
}

type ControllerManager_Controller_VirtualControl struct {
	ControllerManager_Controller_Control
	Manager    *ControllerManager
	Controller *ControllerManager_ConfiguredController
	Joystick   *sdl_mgr.SDLMgr_Joystick
	Name       string
	State      ControllerManager_Controller_ControlState
}

type ControllerManager_Controller_JoyControl struct {
	ControllerManager_Controller_Control
	ControllerManager_Controller_VirtualControl
	Kind        sdl_mgr.SDLMgr_Control_Kind
	Index       int
	SDLMapping  config.Config_Controller_SDLMap_Control
	Calibration config.Config_Controller_CalibrationData
}

type ControllerManager_ConfiguredController struct {
	Manager         *ControllerManager
	Joystick        *sdl_mgr.SDLMgr_Joystick
	Controls        *map_utils.LockMap[string, ControllerManager_Controller_JoyControl]
	VirtualControls *map_utils.LockMap[string, ControllerManager_Controller_VirtualControl]
}

type ControllerManager_UnconfiguredController struct {
	Joystick *sdl_mgr.SDLMgr_Joystick
	/* may have  partial configuration */
	SDLMapping  *config.Config_Controller_SDLMap
	Calibration *config.Config_Controller_Calibration
}

type ControllerManager_Config struct {
	SDLMappingsByName   *map_utils.LockMap[string, config.Config_Controller_SDLMap]
	SDLMappingsByUsbID  *map_utils.LockMap[string, config.Config_Controller_SDLMap]
	CalibrationsByUsbID *map_utils.LockMap[string, config.Config_Controller_Calibration]
}

type ControllerManager struct {
	Context                 context.Context
	SDL                     *sdl_mgr.SDLMgr
	Config                  ControllerManager_Config
	ConfiguredControllers   *map_utils.LockMap[JoystickUniqueID, ControllerManager_ConfiguredController]
	UnconfiguredControllers *map_utils.LockMap[JoystickUniqueID, ControllerManager_UnconfiguredController]

	RawEventChannels          *pubsub_utils.PubSubSlice[ControllerManager_RawEvent]
	ChangeEventChannels       *pubsub_utils.PubSubSlice[ControllerManager_Control_ChangeEvent]
	JoyDevicesUpdatedChannels *pubsub_utils.PubSubSlice[ControllerManager_Control_JoyDevicesUpdated]
}

func (state *ControllerManager_Controller_ControlState) UpdateDirection() {
	last_direction_change_value := state.Direction.ChangeValue
	value_diff := state.NormalizedValues.Value - last_direction_change_value
	if value_diff > DIRECTION_CHANGE_THRESHOLD {
		state.Direction = ControllerManager_Controller_ControlState_DirectionChangeMarker{
			Direction:   1,
			ChangeValue: state.NormalizedValues.Value,
		}
	} else if value_diff < DIRECTION_CHANGE_THRESHOLD {
		state.Direction = ControllerManager_Controller_ControlState_DirectionChangeMarker{
			Direction:   -1,
			ChangeValue: state.NormalizedValues.Value,
		}
	}
}

func (ctrl *ControllerManager_Controller_JoyControl) Reset() {
	switch ctrl.SDLMapping.Kind {
	case sdl_mgr.SDLMgr_Control_Kind_Axis:
		axis_value := ctrl.Joystick.InternalJoystick.Axis(ctrl.SDLMapping.Index)
		ctrl.UpdateValue(float64(axis_value), true)
	case sdl_mgr.SDLMgr_Control_Kind_Button:
		button_value := int(ctrl.Joystick.InternalJoystick.Button(ctrl.SDLMapping.Index))
		ctrl.UpdateValue(float64(int(button_value)), true)
	case sdl_mgr.SDLMgr_Control_Kind_Hat:
		hat_value := int(ctrl.Joystick.InternalJoystick.Hat(ctrl.SDLMapping.Index))
		ctrl.UpdateValue(float64(int(hat_value)), true)
	}
}

func (ctrl *ControllerManager_Controller_JoyControl) GetState() ControllerManager_Controller_ControlState {
	return ctrl.State
}

func (ctrl *ControllerManager_Controller_JoyControl) UpdateValue(value float64, is_reset bool) {
	/* update raw values */
	if is_reset {
		ctrl.State.RawValues.PreviousValue = value
		ctrl.State.RawValues.InitialValue = value
	} else {
		ctrl.State.RawValues.PreviousValue = ctrl.State.RawValues.Value
	}
	ctrl.State.RawValues.Value = value

	/* update normal values */
	normalized_value := ctrl.Calibration.NormalizeRawValue(value)
	if !normalized_value.IsWithinDeadzone {
		rounded_value := math_utils.RoundToMarginOfError(normalized_value.Value)
		if is_reset {
			ctrl.State.NormalizedValues.InitialValue = rounded_value
			ctrl.State.NormalizedValues.PreviousValue = rounded_value
		} else {
			ctrl.State.NormalizedValues.PreviousValue = ctrl.State.NormalizedValues.Value
		}
		ctrl.State.NormalizedValues.Value = rounded_value
	}

	/* update direction */
	if is_reset {
		ctrl.State.Direction = ControllerManager_Controller_ControlState_DirectionChangeMarker{
			Direction:   0,
			ChangeValue: ctrl.State.NormalizedValues.Value,
		}
	} else {
		ctrl.State.UpdateDirection()
	}

	ctrl.Manager.ChangeEventChannels.EmitTimeout(time.Second, ControllerManager_Control_ChangeEvent{
		Joystick:     ctrl.Joystick,
		Controller:   ctrl.Controller,
		Control:      ctrl,
		ControlName:  ctrl.Name,
		ControlState: ctrl.State,
	})
}

func (ctrl *ControllerManager_Controller_VirtualControl) GetState() ControllerManager_Controller_ControlState {
	return ctrl.State
}

func (ctrl *ControllerManager_Controller_VirtualControl) UpdateValue(value float64, is_reset bool) {
	if is_reset {
		ctrl.State.RawValues.PreviousValue = value
		ctrl.State.RawValues.InitialValue = value
		ctrl.State.NormalizedValues.InitialValue = value
		ctrl.State.NormalizedValues.PreviousValue = value
	} else {
		ctrl.State.RawValues.PreviousValue = ctrl.State.RawValues.Value
		ctrl.State.NormalizedValues.PreviousValue = ctrl.State.NormalizedValues.Value
	}
	ctrl.State.RawValues.Value = value
	ctrl.State.NormalizedValues.Value = value

	/* update direction */
	if is_reset {
		ctrl.State.Direction = ControllerManager_Controller_ControlState_DirectionChangeMarker{
			Direction:   0,
			ChangeValue: ctrl.State.NormalizedValues.Value,
		}
	} else {
		ctrl.State.UpdateDirection()
	}

	ctrl.Manager.ChangeEventChannels.EmitTimeout(time.Second, ControllerManager_Control_ChangeEvent{
		Joystick:     ctrl.Joystick,
		Controller:   ctrl.Controller,
		Control:      ctrl,
		ControlName:  ctrl.Name,
		ControlState: ctrl.State,
	})
}

func (ctrl *ControllerManager_Controller_JoyControl) ProcessEvent(event sdl.Event) {
	switch e := event.(type) {
	case *sdl.JoyAxisEvent:
		ctrl.UpdateValue(float64(e.Value), false)
	case *sdl.JoyButtonEvent:
		switch e.State {
		case sdl.PRESSED:
			ctrl.UpdateValue(1.0, false)
		case sdl.RELEASED:
			ctrl.UpdateValue(0.0, false)
		}
	case *sdl.JoyHatEvent:
		ctrl.UpdateValue(float64(e.Value), false)
	}
}

func (controller *ControllerManager_ConfiguredController) RegisterVirtualControl(name string, initial_value float64) {
	controller.VirtualControls.Set(name, ControllerManager_Controller_VirtualControl{
		Manager:    controller.Manager,
		Controller: controller,
		Joystick:   controller.Joystick,
		Name:       name,
		State: ControllerManager_Controller_ControlState{
			Direction: ControllerManager_Controller_ControlState_DirectionChangeMarker{
				Direction:   0,
				ChangeValue: initial_value,
			},
			NormalizedValues: ControllerManager_Controller_ControlStateValues{
				Value:         initial_value,
				PreviousValue: initial_value,
				InitialValue:  initial_value,
			},
			RawValues: ControllerManager_Controller_ControlStateValues{
				Value:         initial_value,
				PreviousValue: initial_value,
				InitialValue:  initial_value,
			},
		},
	})
}

func (controller *ControllerManager_ConfiguredController) ProcessEvent(event sdl.Event) {
	switch e := event.(type) {
	case *sdl.JoyAxisEvent:
		controller.Controls.ForEachMap(func(maybe_axis ControllerManager_Controller_JoyControl, _ string) ControllerManager_Controller_JoyControl {
			if maybe_axis.SDLMapping.Kind == sdl_mgr.SDLMgr_Control_Kind_Axis && maybe_axis.SDLMapping.Index == int(e.Axis) {
				maybe_axis.ProcessEvent(event)
			}
			return maybe_axis
		})
	case *sdl.JoyButtonEvent:
		controller.Controls.ForEachMap(func(maybe_button ControllerManager_Controller_JoyControl, _ string) ControllerManager_Controller_JoyControl {
			if maybe_button.SDLMapping.Kind == sdl_mgr.SDLMgr_Control_Kind_Button && maybe_button.SDLMapping.Index == int(e.Button) {
				maybe_button.ProcessEvent(event)
			}
			return maybe_button
		})
	case *sdl.JoyHatEvent:
		controller.Controls.ForEachMap(func(maybe_hat ControllerManager_Controller_JoyControl, _ string) ControllerManager_Controller_JoyControl {
			if maybe_hat.SDLMapping.Kind == sdl_mgr.SDLMgr_Control_Kind_Hat && maybe_hat.SDLMapping.Index == int(e.Hat) {
				maybe_hat.ProcessEvent(event)
			}
			return maybe_hat
		})
	}
}

func New(sdlmgr *sdl_mgr.SDLMgr) *ControllerManager {
	return &ControllerManager{
		SDL: sdlmgr,
		Config: ControllerManager_Config{
			SDLMappingsByName:   map_utils.NewLockMap[string, config.Config_Controller_SDLMap](),
			SDLMappingsByUsbID:  map_utils.NewLockMap[string, config.Config_Controller_SDLMap](),
			CalibrationsByUsbID: map_utils.NewLockMap[string, config.Config_Controller_Calibration](),
		},
		ConfiguredControllers:   map_utils.NewLockMap[JoystickUniqueID, ControllerManager_ConfiguredController](),
		UnconfiguredControllers: map_utils.NewLockMap[JoystickUniqueID, ControllerManager_UnconfiguredController](),

		RawEventChannels:          pubsub_utils.NewPubSubSlice[ControllerManager_RawEvent](),
		ChangeEventChannels:       pubsub_utils.NewPubSubSlice[ControllerManager_Control_ChangeEvent](),
		JoyDevicesUpdatedChannels: pubsub_utils.NewPubSubSlice[ControllerManager_Control_JoyDevicesUpdated](),
	}
}

func (mgr *ControllerManager) ConfigureJoystick(joystick *sdl_mgr.SDLMgr_Joystick, sdl_map config.Config_Controller_SDLMap, calibration config.Config_Controller_Calibration) ControllerManager_ConfiguredController {
	controller := ControllerManager_ConfiguredController{
		Manager:         mgr,
		Joystick:        joystick,
		Controls:        map_utils.NewLockMap[string, ControllerManager_Controller_JoyControl](),
		VirtualControls: map_utils.NewLockMap[string, ControllerManager_Controller_VirtualControl](),
	}
	for _, control := range sdl_map.Data {
		var calibration_data config.Config_Controller_CalibrationData = config.Config_Controller_CalibrationData{
			Id:           control.Name,
			IsCalibrated: false,
		}
		for _, data := range calibration.Data {
			if data.Id == control.Name {
				calibration_data = data
				calibration_data.IsCalibrated = true
				break
			}
		}

		idle_value := 0.0
		if calibration_data.Idle != nil {
			idle_value = *calibration_data.Idle
		}

		current_raw_value := idle_value
		switch control.Kind {
		case sdl_mgr.SDLMgr_Control_Kind_Axis:
			current_raw_value = float64(joystick.InternalJoystick.Axis(control.Index))
		case sdl_mgr.SDLMgr_Control_Kind_Button:
			current_raw_value = float64(joystick.InternalJoystick.Button(control.Index))
		case sdl_mgr.SDLMgr_Control_Kind_Hat:
			current_raw_value = float64(joystick.InternalJoystick.Hat(control.Index))
		}
		current_normal_value := calibration_data.NormalizeRawValue(current_raw_value).Value

		control := ControllerManager_Controller_JoyControl{
			ControllerManager_Controller_VirtualControl: ControllerManager_Controller_VirtualControl{
				Manager:    mgr,
				Joystick:   joystick,
				Controller: &controller,
				Name:       control.Name,
				State: ControllerManager_Controller_ControlState{
					Direction: ControllerManager_Controller_ControlState_DirectionChangeMarker{
						Direction:   0,
						ChangeValue: current_raw_value,
					},
					NormalizedValues: ControllerManager_Controller_ControlStateValues{
						Value:         current_normal_value,
						PreviousValue: current_normal_value,
						InitialValue:  current_normal_value,
					},
					RawValues: ControllerManager_Controller_ControlStateValues{
						Value:         current_raw_value,
						PreviousValue: current_raw_value,
						InitialValue:  current_raw_value,
					},
				},
			},
			Kind:        control.Kind,
			Index:       control.Index,
			SDLMapping:  control,
			Calibration: calibration_data,
		}
		control.Reset()
		controller.Controls.Set(control.Name, control)
	}

	return controller
}

func (mgr *ControllerManager) RegisterConfig(sdl_map config.Config_Controller_SDLMap, calibration config.Config_Controller_Calibration) {
	mgr.Config.SDLMappingsByName.Set(sdl_map.Name, sdl_map)
	mgr.Config.SDLMappingsByUsbID.Set(sdl_map.UsbID, sdl_map)
	mgr.Config.CalibrationsByUsbID.Set(calibration.UsbID, calibration)

	didConfigureJoystick := false

	/* configure unconfigured controller */
	mgr.UnconfiguredControllers.Mutate(func(unconfigured ControllerManager_UnconfiguredController, unique_id JoystickUniqueID) map_utils.LockMapMutateAction[JoystickUniqueID, ControllerManager_UnconfiguredController] {
		if unconfigured.Joystick.UsbID() == sdl_map.UsbID {
			configured_controller := mgr.ConfigureJoystick(unconfigured.Joystick, sdl_map, calibration)
			mgr.ConfiguredControllers.Set(unique_id, configured_controller)
			didConfigureJoystick = true
			return map_utils.LockMapMutateAction[JoystickUniqueID, ControllerManager_UnconfiguredController]{
				Action: map_utils.LockMapMutateActionType_Delete,
				Key:    unique_id,
			}
		}
		return map_utils.LockMapMutateAction[JoystickUniqueID, ControllerManager_UnconfiguredController]{
			Action: map_utils.LockMapMutateActionType_Noop,
		}
	})

	/* replace configured controller */
	mgr.ConfiguredControllers.Mutate(func(configured ControllerManager_ConfiguredController, unique_id JoystickUniqueID) map_utils.LockMapMutateAction[JoystickUniqueID, ControllerManager_ConfiguredController] {
		if configured.Joystick.UsbID() == sdl_map.UsbID {
			configured_controller := mgr.ConfigureJoystick(configured.Joystick, sdl_map, calibration)
			didConfigureJoystick = true
			return map_utils.LockMapMutateAction[JoystickUniqueID, ControllerManager_ConfiguredController]{
				Action: map_utils.LockMapMutateActionType_Replace,
				Key:    unique_id,
				Value:  configured_controller,
			}
		}
		return map_utils.LockMapMutateAction[JoystickUniqueID, ControllerManager_ConfiguredController]{
			Action: map_utils.LockMapMutateActionType_Noop,
		}
	})

	if didConfigureJoystick {
		mgr.JoyDevicesUpdatedChannels.EmitTimeout(time.Second, ControllerManager_Control_JoyDevicesUpdated{})
	}
}

func (mgr *ControllerManager) Handler_JoyDeviceAdded(event *sdl.JoyDeviceAddedEvent) error {
	/* for joy device added -> Which is the index; this differs from other SDL events */
	joystick, err := mgr.SDL.GetJoystickByInstanceID(event.Which)
	if err != nil {
		return err
	}

	sdl_map, has_sdl_map := mgr.Config.SDLMappingsByUsbID.Get(joystick.UsbID())
	calibration, has_calibration := mgr.Config.CalibrationsByUsbID.Get(joystick.UsbID())
	if has_sdl_map && has_calibration {
		configured_controller := mgr.ConfigureJoystick(joystick, sdl_map, calibration)
		mgr.ConfiguredControllers.Set(joystick.UniqueID(), configured_controller)
		mgr.JoyDevicesUpdatedChannels.EmitTimeout(time.Second, ControllerManager_Control_JoyDevicesUpdated{})
	} else {
		unconfigured_controller := ControllerManager_UnconfiguredController{
			Joystick:    joystick,
			SDLMapping:  nil,
			Calibration: nil,
		}
		if has_sdl_map {
			unconfigured_controller.SDLMapping = &sdl_map
		}
		if has_calibration {
			unconfigured_controller.Calibration = &calibration
		}
		mgr.UnconfiguredControllers.Set(joystick.UniqueID(), unconfigured_controller)
		mgr.JoyDevicesUpdatedChannels.EmitTimeout(time.Second, ControllerManager_Control_JoyDevicesUpdated{})
	}

	return nil
}

func (mgr *ControllerManager) Handler_JoyDeviceRemoved(event *sdl.JoyDeviceRemovedEvent) error {
	mgr.ConfiguredControllers.Mutate(func(configured_controller ControllerManager_ConfiguredController, unique_id JoystickUniqueID) map_utils.LockMapMutateAction[JoystickUniqueID, ControllerManager_ConfiguredController] {
		if configured_controller.Joystick.InstanceID == event.Which {
			logger.Logger.Info("[ControllerManager:Handler_JoyDeviceRemoved] Removing joy device", "name", configured_controller.Joystick.Name)
			defer func() {
				mgr.JoyDevicesUpdatedChannels.EmitTimeout(time.Second, ControllerManager_Control_JoyDevicesUpdated{})
			}()
			return map_utils.LockMapMutateAction[JoystickUniqueID, ControllerManager_ConfiguredController]{
				Action: map_utils.LockMapMutateActionType_Delete,
				Key:    unique_id,
			}
		}
		return map_utils.LockMapMutateAction[JoystickUniqueID, ControllerManager_ConfiguredController]{
			Action: map_utils.LockMapMutateActionType_Noop,
		}
	})

	mgr.UnconfiguredControllers.Mutate(func(unconfigured_controller ControllerManager_UnconfiguredController, unique_id JoystickUniqueID) map_utils.LockMapMutateAction[JoystickUniqueID, ControllerManager_UnconfiguredController] {
		if unconfigured_controller.Joystick.InstanceID == event.Which {
			logger.Logger.Info("[ControllerManager:Handler_JoyDeviceRemoved] Removing joy device", "name", unconfigured_controller.Joystick.Name)
			defer func() {
				mgr.JoyDevicesUpdatedChannels.EmitTimeout(time.Second, ControllerManager_Control_JoyDevicesUpdated{})
			}()
			return map_utils.LockMapMutateAction[JoystickUniqueID, ControllerManager_UnconfiguredController]{
				Action: map_utils.LockMapMutateActionType_Delete,
				Key:    unique_id,
			}
		}
		return map_utils.LockMapMutateAction[JoystickUniqueID, ControllerManager_UnconfiguredController]{
			Action: map_utils.LockMapMutateActionType_Noop,
		}
	})

	return nil
}

func (mgr *ControllerManager) Handler_JoyAxisEvent(event *sdl.JoyAxisEvent) error {
	joystick, err := mgr.SDL.GetJoystickByInstanceID(event.Which)
	if err != nil {
		logger.Logger.Error("[ControllerManager::Handler_JoyAxisEvent] could not get joystick", "error", err)
		return err
	}

	/* only send if the channel is being read */
	mgr.RawEventChannels.EmitTimeout(time.Second, ControllerManager_RawEvent{
		Joystick: joystick,
		Event:    event,
	})

	/* send for processing if configured */
	configured, is_configured := mgr.ConfiguredControllers.Get(joystick.UniqueID())
	if is_configured {
		configured.ProcessEvent(event)
	}

	return nil
}

func (mgr *ControllerManager) Handler_JoyButtonEvent(event *sdl.JoyButtonEvent) error {
	joystick, err := mgr.SDL.GetJoystickByInstanceID(event.Which)
	if err != nil {
		logger.Logger.Error("[ControllerManager::Handler_JoyButtonEvent] could not get joystick", "error", err)
		return err
	}

	/* only send if the channel is being read */
	mgr.RawEventChannels.EmitTimeout(time.Second, ControllerManager_RawEvent{
		Joystick: joystick,
		Event:    event,
	})

	/* send for processing if configured */
	configured, is_configured := mgr.ConfiguredControllers.Get(joystick.UniqueID())
	if is_configured {
		logger.Logger.Debug("[ControllerManager::Handler_JoyButtonEvent] processing button event", "event", event)
		configured.ProcessEvent(event)
	} else {
		logger.Logger.Info("[ControllerManager::Handler_JoyButtonEvent] skipping processing because of unconfigured controller", "event", event)
	}

	return nil
}

func (mgr *ControllerManager) Handler_JoyHatEvent(event *sdl.JoyHatEvent) error {
	joystick, err := mgr.SDL.GetJoystickByInstanceID(event.Which)
	if err != nil {
		logger.Logger.Error("[ControllerManager::Handler_JoyHatEvent] could not get joystick", "error", err)
		return err
	}

	/* only send if the channel is being read */
	mgr.RawEventChannels.EmitTimeout(time.Second, ControllerManager_RawEvent{
		Joystick: joystick,
		Event:    event,
	})

	/* send for processing if configured */
	configured, is_configured := mgr.ConfiguredControllers.Get(joystick.UniqueID())
	if is_configured {
		configured.ProcessEvent(event)
	}

	return nil
}

func (mgr *ControllerManager) Attach(ctx context.Context) context.CancelFunc {
	ctx_with_cancel, cancel := context.WithCancel(ctx)

	go func() {
		/* returns a cancel but will be cancelled by it's parent context */
		events_channel, _ := mgr.SDL.StartPolling(ctx_with_cancel)
		for {
			select {
			case event := <-events_channel:
				logger.Logger.Debug("[ControllerManager.Attach] Received SDL2 event", "event", event)
				switch e := event.(type) {
				case *sdl.JoyDeviceAddedEvent:
					mgr.Handler_JoyDeviceAdded(e)
				case *sdl.JoyDeviceRemovedEvent:
					mgr.Handler_JoyDeviceRemoved(e)
				case *sdl.JoyAxisEvent:
					mgr.Handler_JoyAxisEvent(e)
				case *sdl.JoyButtonEvent:
					mgr.Handler_JoyButtonEvent(e)
				case *sdl.JoyHatEvent:
					mgr.Handler_JoyHatEvent(e)
				case *sdl.QuitEvent:
					cancel()
				}
			case <-ctx_with_cancel.Done():
				return
			}
		}
	}()
	return cancel
}

func (mgr *ControllerManager) SubscribeRaw() (chan ControllerManager_RawEvent, func()) {
	return mgr.RawEventChannels.Subscribe()
}

func (mgr *ControllerManager) SubscribeChangeEvent() (chan ControllerManager_Control_ChangeEvent, func()) {
	return mgr.ChangeEventChannels.Subscribe()
}

func (mgr *ControllerManager) SubscribeJoyDevicesUpdated() (chan ControllerManager_Control_JoyDevicesUpdated, func()) {
	return mgr.JoyDevicesUpdatedChannels.Subscribe()
}
