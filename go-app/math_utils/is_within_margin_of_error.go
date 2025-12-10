package math_utils

import "math"

func IsWithinMarginOfError(value1 float64, value2 float64) bool {
	return math.Abs(value1-value2) <= 0.0001
}
