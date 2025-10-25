package main

import (
	"fmt"
	"strconv"
)

func isPalindrome2String(x int) bool {
	s := strconv.Itoa(x)
	for i := 0; i < len(s)/2; i++ {
		j := len(s) - i - 1
		if s[i] != s[j] {
			return false
		}
	}
	return true
}
func isPalindrome2String2(x int) bool {
	s := strconv.Itoa(x)
	left, right := 0, len(s)-1

	for left < right {
		if s[left] != s[right] {
			return false
		}
		left++
		right--
	}
	return true
}
func isPalindrome2String3(x int) bool {
	s := strconv.Itoa(x)
	reverse := ""
	for i := len(s) - 1; i >= 0; i-- {
		reverse += string(s[i])
	}
	return s == reverse
}

func isPalindrome(x int) bool {
	if x < 0 {
		return false
	}
	original := x
	reverse := 0
	for x > 0 {
		reverse = reverse*10 + x%10
		x = x / 10
	}

	return original == reverse
}
func main() {
	num := 121
	fmt.Println(isPalindrome(num))
	fmt.Println(isPalindrome2String(num))
	fmt.Println(isPalindrome2String2(num))
	fmt.Println(isPalindrome2String3(num))

}
