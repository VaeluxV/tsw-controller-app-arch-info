package controller_mgr

import (
	"context"
	"tsw_controller_app/tswconnector"
)

type VirtualControllerManager struct {
	context   context.Context
	connector tswconnector.TSWConnector
}

// var _ IControllerManager = &VirtualControllerManager

func NewVirtualControllerManager(conn tswconnector.TSWConnector) *VirtualControllerManager {
	return &VirtualControllerManager{
		context:   context.Background(),
		connector: conn,
	}
}
