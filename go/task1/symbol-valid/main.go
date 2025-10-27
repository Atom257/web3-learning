package main

import "fmt"

func isValid(s string) bool {

	var temp []byte

	for _, v := range s {

		switch string(v) {
		case "(", "[", "{":
			temp = append(temp, byte(v))
		case ")":
			if len(temp) > 0 && temp[len(temp)-1] == '(' {
				temp = temp[:len(temp)-1]
			} else {
				temp = append(temp, byte(v))
			}
		case "]":
			if len(temp) > 0 && temp[len(temp)-1] == '[' {
				temp = temp[:len(temp)-1]
			} else {
				temp = append(temp, byte(v))
			}
		case "}":
			if len(temp) > 0 && temp[len(temp)-1] == '{' {
				temp = temp[:len(temp)-1]
			} else {
				temp = append(temp, byte(v))
			}
		}
	}
	if len(temp) > 0 {
		return false
	}
	return true
}

func main() {
	s1 := "()"
	s2 := "()[]{}"
	s3 := "(]"
	s4 := "([])"
	s5 := "([)]"
	fmt.Println(isValid(s1)) //true
	fmt.Println(isValid(s2)) //true
	fmt.Println(isValid(s3)) //false
	fmt.Println(isValid(s4)) //true
	fmt.Println(isValid(s5)) //false

}
