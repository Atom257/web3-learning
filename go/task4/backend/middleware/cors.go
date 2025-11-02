package middleware

import (
	"github.com/gin-gonic/gin"
)

// CORSMiddleware CORS跨域中间件
// 处理跨域请求，设置响应头
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// TODO: 实现CORS逻辑
		// 1. 设置 Access-Control-Allow-Origin
		c.Header("Access-Control-Allow-Origin", "*")

		// 生产环境：从配置读取允许的域名
		//origin := c.Request.Header.Get("Origin")
		//allowedOrigins := []string{"http://localhost:8080", "https://yourdomain.com"}
		//for _, allowedOrigin := range allowedOrigins {
		//	if origin == allowedOrigin {
		//		c.Header("Access-Control-Allow-Origin", origin)
		//		break
		//	}
		//}

		// 2. 设置 Access-Control-Allow-Methods
		c.Header("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE, UPDATE")
		// 3. 设置 Access-Control-Allow-Headers
		c.Header("Access-Control-Allow-Headers",
			"Origin, X-Requested-With, Content-Type, Accept, Authorization")
		//c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Max-Age", "86400")
		// 4. 处理 OPTIONS 预检请求
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	}
}
