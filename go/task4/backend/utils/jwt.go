package utils

import (
	"blog/config"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// GenerateToken 生成JWT Token
// 根据用户ID生成JWT Token字符串
type Claims struct {
	UserID uint `json:"user_id"`
	jwt.RegisteredClaims
}

var cfg = config.LoadConfig()

func GenerateToken(userID uint) (string, error) {
	// 实现JWT生成逻辑
	// 1. 创建Claims（包含用户ID、过期时间等）
	expirationTime := time.Now().Add(cfg.JWT.ExpireTime)
	claims := Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    "blog-service",
		},
	}
	// 2. 使用密钥签名
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	// 3. 返回Token字符串

	tokenString, err := token.SignedString([]byte(cfg.JWT.Secret))
	if err != nil {
		return "", err
	}
	return tokenString, nil
}

// ParseToken 解析JWT Token
// 解析JWT Token并返回用户ID
func ParseToken(tokenString string) (uint, error) {
	// 实现JWT解析逻辑
	// 1. 解析Token字符串
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(cfg.JWT.Secret), nil
	})
	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return 0, fmt.Errorf("token expired")
		}
		return 0, errors.New("invalid token")
	}

	// 提取用户信息
	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims.UserID, nil
	}

	return 0, errors.New("invalid token claims")
}

// ValidateToken 验证Token有效性
// 检查Token是否有效（未过期、签名正确）
func ValidateToken(tokenString string) (uint, error) {
	// 实现Token验证逻辑
	// 调用 ParseToken 并检查错误
	userID, err := ParseToken(tokenString)
	if err != nil {
		return 0, err
	}
	return userID, nil
}
