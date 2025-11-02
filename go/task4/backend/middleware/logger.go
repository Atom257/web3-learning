package middleware

import (
	"log"
	"time"

	"github.com/gin-gonic/gin"
)

// LoggerMiddleware 请求日志中间件
// 记录每个HTTP请求的信息和响应时间
func LoggerMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// TODO: 实现日志记录逻辑
		// 1. 记录请求开始时间
		start := time.Now()
		// 2. 记录请求方法、路径、IP等
		method := c.Request.Method
		path := c.Request.URL.Path
		clientIP := c.ClientIP()
		// 3. 处理请求
		c.Next()
		// 4. 记录响应状态码、响应时间
		latency := time.Since(start)
		statusCode := c.Writer.Status()
		//打印日志
		log.Printf("[GIN] %3d | %13v | %15s | %-7s %s",
			statusCode, latency, clientIP, method, path)
	}
}
