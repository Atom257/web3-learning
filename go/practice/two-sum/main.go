package main

import (
	"fmt"
)

func twoSum(nums []int, target int) []int {
	for i := 0; i < len(nums); i++ {
		for j := i + 1; j < len(nums); j++ {
			if nums[i]+nums[j] == target {
				return []int{i, j}
			}
		}
	}
	return nil
}

func twoSum2(nums []int, target int) []int {
	m := make(map[int]int)
	for i, v := range nums {

		num2 := target - v
		if idx, ok := m[num2]; ok {
			return []int{idx, i}
		}
		m[v] = i
	}
	return nil
}

func main() {
	nums1 := []int{2, 7, 11, 15}
	target1 := 9

	nums2 := []int{3, 2, 4}
	target2 := 6

	nums3 := []int{3, 3}
	target3 := 6

	fmt.Println(twoSum(nums1, target1))
	fmt.Println(twoSum(nums2, target2))
	fmt.Println(twoSum(nums3, target3))

	fmt.Println(twoSum2(nums1, target1))
	fmt.Println(twoSum2(nums2, target2))
	fmt.Println(twoSum2(nums3, target3))
}
