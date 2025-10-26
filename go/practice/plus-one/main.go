package main

import (
	"fmt"
)

func plusOne(digits []int) []int {

	for i := len(digits) - 1; i >= 0; i-- {
		digits[i]++
		if digits[i] < 10 {
			return digits
		}
		digits[i] = 0
	}

	return append([]int{1}, digits...)
}

func main() {
	case1 := []int{1, 2, 3}
	case2 := []int{4, 3, 2, 1}
	case3 := []int{9}
	case4 := []int{9, 9, 8, 9, 9}
	fmt.Println(plusOne(case1))
	fmt.Println(plusOne(case2))
	fmt.Println(plusOne(case3))
	fmt.Println(plusOne(case4))
}
