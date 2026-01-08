package controller_mgr

type ControllerManager_RawEvent_Device struct {
	UniqueID string
	DeviceID string
}

type IControllerManager_RawEvent interface {
	Device() *ControllerManager_RawEvent_Device
	Timestamp() int
}

type ControllerManager_RawEvent_DeviceAdded struct {
	device    *ControllerManager_RawEvent_Device
	timestamp int
}

type ControllerManager_RawEvent_DeviceRemoved struct {
	device    *ControllerManager_RawEvent_Device
	timestamp int
}

type ControllerManager_RawEvent_Axis struct {
	device    *ControllerManager_RawEvent_Device
	timestamp int
	axis      int
	value     float64
}

type ControllerManager_RawEvent_Button struct {
	device    *ControllerManager_RawEvent_Device
	timestamp int
	button    int
	value     float64
}

type ControllerManager_RawEvent_Hat struct {
	device    *ControllerManager_RawEvent_Device
	timestamp int
	hat       int
	value     float64
}

var _ IControllerManager_RawEvent = &ControllerManager_RawEvent_DeviceAdded{}

var _ IControllerManager_RawEvent = &ControllerManager_RawEvent_DeviceRemoved{}

var _ IControllerManager_RawEvent = &ControllerManager_RawEvent_Axis{}

/* -- ControllerManager_RawEvent_DeviceAdded -- */
func (e *ControllerManager_RawEvent_DeviceAdded) Device() *ControllerManager_RawEvent_Device {
	return e.device
}

func (e *ControllerManager_RawEvent_DeviceAdded) Timestamp() int {
	return e.timestamp
}

/* -- ControllerManager_RawEvent_DeviceRemoved -- */
func (e *ControllerManager_RawEvent_DeviceRemoved) Device() *ControllerManager_RawEvent_Device {
	return e.device
}

func (e *ControllerManager_RawEvent_DeviceRemoved) Timestamp() int {
	return e.timestamp
}

/* -- ControllerManager_RawEvent_Axis -- */
func (e *ControllerManager_RawEvent_Axis) Device() *ControllerManager_RawEvent_Device {
	return e.device
}

func (e *ControllerManager_RawEvent_Axis) Timestamp() int {
	return e.timestamp
}

func (e *ControllerManager_RawEvent_Axis) Axis() int {
	return e.axis
}

func (e *ControllerManager_RawEvent_Axis) Value() float64 {
	return e.value
}

/* -- ControllerManager_RawEvent_Button -- */
func (e *ControllerManager_RawEvent_Button) Device() *ControllerManager_RawEvent_Device {
	return e.device
}

func (e *ControllerManager_RawEvent_Button) Timestamp() int {
	return e.timestamp
}

func (e *ControllerManager_RawEvent_Button) Button() int {
	return e.button
}

func (e *ControllerManager_RawEvent_Button) Value() float64 {
	return e.value
}

/* -- ControllerManager_RawEvent_Hat -- */
func (e *ControllerManager_RawEvent_Hat) Device() *ControllerManager_RawEvent_Device {
	return e.device
}

func (e *ControllerManager_RawEvent_Hat) Timestamp() int {
	return e.timestamp
}

func (e *ControllerManager_RawEvent_Hat) Hat() int {
	return e.hat
}

func (e *ControllerManager_RawEvent_Hat) Value() float64 {
	return e.value
}
