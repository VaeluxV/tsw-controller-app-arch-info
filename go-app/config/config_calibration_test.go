package config

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestConfigCalibration_NormalizeRawValue(t *testing.T) {
	var deadzone float64 = 500
	var idle float64 = 0
	calibration := Config_Controller_CalibrationData{
		Id:           "",
		IsCalibrated: true,
		Deadzone:     &deadzone,
		Idle:         &idle,
		Min:          -32000,
		Max:          32000,
	}
	assert.Equal(t, calibration.NormalizeRawValue(-32000), NormalizedValue{
		Value:            -1,
		IsWithinDeadzone: false,
	})
	assert.Equal(t, calibration.NormalizeRawValue(32000), NormalizedValue{
		Value:            1,
		IsWithinDeadzone: false,
	})

	assert.Equal(t, calibration.NormalizeRawValue(-400), NormalizedValue{
		Value:            0,
		IsWithinDeadzone: true,
	})
	assert.Equal(t, calibration.NormalizeRawValue(400), NormalizedValue{
		Value:            0,
		IsWithinDeadzone: true,
	})

	assert.Equal(t, calibration.NormalizeRawValue(501), NormalizedValue{
		Value:            1.0 / (32000 - 500),
		IsWithinDeadzone: false,
	})
}
