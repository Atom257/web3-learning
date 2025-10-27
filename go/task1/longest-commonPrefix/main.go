package main

import (
	"fmt"
	"strings"
)

func longestCommonPrefix(strs []string) string {
	if len(strs) == 0 {
		return ""
	}
	strLen := 0
	for _, v := range strs {
		if strLen == 0 {
			strLen = len(v)
		} else if strLen > len(v) {
			strLen = len(v)
		}

	}

	prefix := ""

	for i := 0; i < strLen; i++ {
		tempStr := ""
		for _, v := range strs {
			if tempStr == "" {
				tempStr = string(v[i])
			} else if tempStr != string(v[i]) {
				tempStr = ""
				break
			}

		}
		prefix += tempStr
	}

	return prefix
}

func longestCommonPrefix2(strs []string) string {
	if len(strs) == 0 {
		return ""
	}
	prefix := strs[0]
	for i := 1; i < len(strs); i++ {
		for !strings.HasPrefix(strs[i], prefix) {
			prefix = prefix[:len(prefix)-1]
			if prefix == "" {
				return ""
			}
		}
	}
	return prefix
}

func main() {
	str1 := []string{"flower", "flow", "flight"}
	str2 := []string{"dog", "racecar", "car"}

	fmt.Println("str1:", longestCommonPrefix(str1))
	fmt.Println("str2:", longestCommonPrefix(str2))
	fmt.Println("str2:", longestCommonPrefix2(str1))
	fmt.Println("str2:", longestCommonPrefix2(str2))
}
