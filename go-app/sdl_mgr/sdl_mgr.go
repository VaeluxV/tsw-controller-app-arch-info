package sdl_mgr

import (
	"context"
	"crypto/sha1"
	"fmt"
	"time"
	"tsw_controller_app/chan_utils"
	"tsw_controller_app/logger"

	"github.com/veandco/go-sdl2/sdl"
)

/* the SDL control kind like Button, Hat, Axis */
type SDLMgr_Control_Kind = string
type SDLMgr_Guid_Str = string

const SDL_BUFFER_SIZE = 32
const SDL_RATE = 16

const (
	SDLMgr_Control_Kind_Button SDLMgr_Control_Kind = "button"
	SDLMgr_Control_Kind_Hat    SDLMgr_Control_Kind = "hat"
	SDLMgr_Control_Kind_Axis   SDLMgr_Control_Kind = "axis"
)

type SDLMgr_Joystick struct {
	GUID      SDLMgr_Guid_Str
	Name      string
	VendorID  int
	ProductID int
	Index     int

	IsOpen           bool
	InternalJoystick *sdl.Joystick
}

type SDLMgr struct {
	Initialized bool
	Timestamp   time.Time
}

func New() *SDLMgr {
	return &SDLMgr{
		Initialized: false,
	}
}

/*
Initializes the SDL library for the app
sdl.Init is guarded to only be ran once per app
*/
func (mgr *SDLMgr) PanicInit() bool {
	if !mgr.Initialized {
		init_ts := time.Now()

		/* try to initialize if not already initialized */
		sdl.JoystickEventState(1)
		if err := sdl.Init(sdl.INIT_GAMECONTROLLER | sdl.INIT_JOYSTICK | sdl.INIT_EVENTS); err != nil {
			panic(err)
		}

		mgr.Initialized = true
		mgr.Timestamp = init_ts
	}

	return true
}

/* Just a passthrough for the sdl quit method */
func (mgr *SDLMgr) Quit() {
	sdl.Quit()
}

func (mgr *SDLMgr) GetJoystickByIndex(index int) (*SDLMgr_Joystick, error) {
	if index >= sdl.NumJoysticks() {
		return nil, fmt.Errorf("index is out of range for number of registered SDL joysticks")
	}

	name := sdl.JoystickNameForIndex(index)
	guid := sdl.JoystickGetGUIDString(sdl.JoystickGetDeviceGUID(index))
	usb_vendor := sdl.JoystickGetDeviceVendor(index)
	usb_product := sdl.JoystickGetDeviceProduct(index)

	return &SDLMgr_Joystick{
		GUID:      guid,
		Name:      name,
		VendorID:  usb_vendor,
		ProductID: usb_product,
		Index:     index,
		IsOpen:    false,
	}, nil
}

/*
Starts polling for events within a go-routine every 60ms
Can be cancelled using the context
Returns a channel to listen to events
*/
func (mgr *SDLMgr) StartPolling(ctx context.Context) (chan sdl.Event, context.CancelFunc) {
	ctx_with_cancel, cancel := context.WithCancel(ctx)
	event_channel := make(chan sdl.Event, SDL_BUFFER_SIZE)

	go func() {
		for {
			/* stop if context has been cancelled */
			if ctx_with_cancel.Err() != nil {
				return
			}

			if event := sdl.WaitEventTimeout(SDL_RATE); event != nil {
				switch e := event.(type) {
				case *sdl.JoyDeviceAddedEvent:
					chan_utils.SendTimeout[sdl.Event](event_channel, time.Second, &sdl.JoyDeviceAddedEvent{
						Type:      e.Type,
						Timestamp: e.Timestamp,
						Which:     e.Which,
					})
				case *sdl.JoyDeviceRemovedEvent:
					chan_utils.SendTimeout[sdl.Event](event_channel, time.Second, &sdl.JoyDeviceRemovedEvent{
						Type:      e.Type,
						Timestamp: e.Timestamp,
						Which:     e.Which,
					})
				case *sdl.JoyButtonEvent:
					chan_utils.SendTimeout[sdl.Event](event_channel, time.Second, &sdl.JoyButtonEvent{
						Type:      e.Type,
						Timestamp: e.Timestamp,
						Which:     e.Which,
						Button:    e.Button,
						State:     e.State,
					})
				case *sdl.JoyHatEvent:
					chan_utils.SendTimeout[sdl.Event](event_channel, time.Second, &sdl.JoyHatEvent{
						Type:      e.Type,
						Timestamp: e.Timestamp,
						Which:     e.Which,
						Hat:       e.Hat,
						Value:     e.Value,
					})
				case *sdl.JoyAxisEvent:
					chan_utils.SendTimeout[sdl.Event](event_channel, time.Second, &sdl.JoyAxisEvent{
						Type:      e.Type,
						Timestamp: e.Timestamp,
						Which:     e.Which,
						Axis:      e.Axis,
						Value:     e.Value,
					})
				}
			}
		}
	}()
	return event_channel, cancel
}

func (joystick *SDLMgr_Joystick) UsbID() string {
	return fmt.Sprintf("%04X:%04X", joystick.VendorID, joystick.ProductID)
}

func (joystick *SDLMgr_Joystick) UniqueID() string {
	unique_id := fmt.Sprintf("guid=%s,usb_id=%s,index=%d", joystick.GUID, joystick.UsbID(), joystick.Index)
	hash := sha1.Sum([]byte(unique_id))
	return fmt.Sprintf("%x", hash)
}

func (joystick *SDLMgr_Joystick) Open() error {
	if joystick.IsOpen {
		return nil
	}

	logger.Logger.Info("[SDLMgr_Joystick::Open] opening joystick", "joystick", joystick.UsbID(), "name", joystick.Name)
	joystick.InternalJoystick = sdl.JoystickOpen(joystick.Index)
	if joystick.InternalJoystick == nil {
		return fmt.Errorf("could not open joystick for use")
	}
	joystick.IsOpen = true
	return nil
}

func (joystick *SDLMgr_Joystick) Close() error {
	if !joystick.IsOpen {
		return fmt.Errorf("joystick is not open")
	}

	if joystick.InternalJoystick == nil {
		return fmt.Errorf("internal joystick not assigned")
	}

	joystick.InternalJoystick.Close()
	joystick.IsOpen = false
	joystick.InternalJoystick = nil
	return nil
}
