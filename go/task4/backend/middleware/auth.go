package middleware

import (
	"blog/utils"
	"strings"

	"github.com/gin-gonic/gin"
)

// AuthMiddleware JWT验证中间件
// 验证请求中的JWT Token，提取用户信息并放入上下文
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 实现JWT验证逻辑

		// 从请求头获取Token（Authorization: Bearer <token>）
		tokenString := c.Request.Header.Get("Authorization")
		if tokenString == "" {
			utils.Error(c, utils.CodeUnauthorized, utils.MsgUnauthorized)
			c.Abort()
			return
		}
		// 验证Token格式
		parts := strings.SplitN(tokenString, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			utils.Error(c, utils.CodeUnauthorized, utils.MsgUnauthorized)
			c.Abort()
			return
		}
		// 验证Token有效性,解析Token获取用户ID
		userId, err := utils.ValidateToken(parts[1])
		if err != nil {
			utils.Error(c, utils.CodeUnauthorized, utils.MsgUnauthorized)
			c.Abort()
			return
		}
		//将用户ID存入上下文
		c.Set("user_id", userId)

		c.Next()
	}
}

// GetUserFromContext 从上下文获取用户ID
// 从Gin上下文中提取当前登录用户的ID
func GetUserFromContext(c *gin.Context) (uint, bool) {
	//实现从上下文获取用户ID的逻辑
	// 从 c.Get("userID") 获取并转换为 uint
	userId, exists := c.Get("user_id")
	if !exists {
		return 0, false
	}
	return userId.(uint), true
}
