package routes

import (
	"blog/handlers"
	"blog/middleware"

	"github.com/gin-gonic/gin"
)

// SetupRoutes 注册所有路由
// 主路由注册函数，配置所有API端点和中间件
func SetupRoutes(r *gin.Engine) {
	// 实现路由注册逻辑
	// 1. 应用全局中间件（CORS、日志）
	r.Use(middleware.CORSMiddleware(), gin.Recovery(), middleware.LoggerMiddleware())

	// 使用相对路径（从 backend 目录出发）
	r.Static("/css", "../frontend/css")
	r.Static("/js", "../frontend/js")
	r.StaticFile("/", "../frontend/index.html")
	r.StaticFile("/index.html", "../frontend/index.html")
	r.StaticFile("/pages/login.html", "../frontend/pages/login.html")
	r.StaticFile("/pages/register.html", "../frontend/pages/register.html")
	r.StaticFile("/pages/create-post.html", "../frontend/pages/create-post.html")
	r.StaticFile("/pages/post-detail.html", "../frontend/pages/post-detail.html")

	// 2. 创建API路由组 /api
	api := r.Group("/api")
	{ // 3. 注册各功能模块的路由
		setupAuthRoutes(api)
		setupPostRoutes(api)
		setupCommentRoutes(api)
	}

}

// setupAuthRoutes 注册认证路由
// 注册用户注册和登录相关的路由
func setupAuthRoutes(r *gin.RouterGroup) {
	//实现认证路由注册
	r.POST("/auth/register", handlers.Register)
	r.POST("/auth/login", handlers.Login)
}

// setupPostRoutes 注册文章路由
// 注册文章CRUD相关的路由
func setupPostRoutes(r *gin.RouterGroup) {
	// TODO: 实现文章路由注册
	r.GET("/posts", handlers.GetPosts)
	r.GET("/posts/:id", handlers.GetPost)
	r.POST("/posts", middleware.AuthMiddleware(), handlers.CreatePost)
	r.PUT("/posts/:id", middleware.AuthMiddleware(), handlers.UpdatePost)
	r.DELETE("/posts/:id", middleware.AuthMiddleware(), handlers.DeletePost)
}

// setupCommentRoutes 注册评论路由
// 注册评论创建和查询相关的路由
func setupCommentRoutes(r *gin.RouterGroup) {
	// TODO: 实现评论路由注册
	r.GET("/comments/post/:post_id", handlers.GetCommentsByPost)
	r.POST("/comments", middleware.AuthMiddleware(), handlers.CreateComment)
}
