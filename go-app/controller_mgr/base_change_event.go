package controller_mgr

type ControllerManager_ChangeEvent_Device struct {
	UniqueID string
	DeviceID string
}
type ControllerManager_Control_ChangeEvent struct {
	Device       *ControllerManager_ChangeEvent_Device
	Controller   IControllerManager_Controller
	Control      IControllerManager_Controller_Control
	ControlName  string
	ControlState ControllerManager_Controller_ControlState
}
