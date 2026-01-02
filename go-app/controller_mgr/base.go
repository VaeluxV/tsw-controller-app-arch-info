package controller_mgr

import (
	"context"
)

type IControllerManager interface {
	Attach(c context.Context) context.CancelFunc
	SubscribeRaw() (chan IControllerManager_RawEvent, func())
}
