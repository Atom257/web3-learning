package main

import (
	"fmt"
)

func removeDuplicates(nums []int) int {
	if len(nums) == 0 {
		return 0
	}

	pre := 0
	for next := 1; next < len(nums); next++ {
		if nums[pre] != nums[next] {
			pre++
			nums[pre] = nums[next]

		}
	}

	return pre + 1
}
func removeDuplicates2(nums []int) int {

	for {
		lenNum := len(nums)

		for i := 0; i < len(nums); i++ {
			for j := i + 1; j < len(nums); j++ {
				if nums[i] == nums[j] {
					nums = append(nums[:i], nums[j:]...)
					break
				}
			}
		}
		if lenNum == len(nums) {
			break
		}

	}
	fmt.Println(nums)
	return len(nums)
}

func main() {
	case1 := []int{1, 1, 2}
	case2 := []int{0, 0, 1, 1, 1, 2, 2, 3, 3, 4}
	fmt.Println(removeDuplicates(case1))
	fmt.Println(removeDuplicates(case2))
}
