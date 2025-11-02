package utils

import (
	"errors"

	"golang.org/x/crypto/bcrypt"
)

// HashPassword 密码加密
// 使用bcrypt算法加密密码
func HashPassword(password string) (string, error) {
	if password == "" || len(password) < 6 {
		return "", errors.New("密码不能少于6位")
	}
	//实现密码加密逻辑
	// 1. 使用 bcrypt.GenerateFromPassword
	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	// 2. 返回加密后的密码字符串
	if err != nil {
		return "", err
	}
	return string(hashed), nil
}

// CheckPassword 密码验证
// 验证明文密码是否与加密密码匹配
func CheckPassword(password, hashedPassword string) bool {
	//  实现密码验证逻辑
	// 1. 使用 bcrypt.CompareHashAndPassword
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
	if err != nil {
		return false
	}
	// 2. 返回是否匹配
	return true
}
