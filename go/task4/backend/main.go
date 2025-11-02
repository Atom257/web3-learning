package main

import (
	"blog/config"
	"blog/database"
	"blog/routes"
	"log"

	"github.com/gin-gonic/gin"
)

// main 是程序入口
// 功能：初始化数据库、注册路由、启动服务器
func main() {
	log.Println("Blog server starting...")
	// 初始化配置
	cfg := config.LoadConfig()
	//初始化数据库连接
	err := database.InitDB(&cfg.Database)
	if err != nil {
		log.Fatal("Blog database init error: ", err)

	}
	// 自动迁移表结构
	err = database.InitTable()
	if err != nil {
		log.Fatal("Blog database migrate error: ", err)

	}

	// 注册路由
	router := gin.Default()
	routes.SetupRoutes(router)
	//  启动 HTTP 服务器
	err = router.Run(cfg.Server.Host + ":" + cfg.Server.Port)
	if err != nil {
		log.Fatal("Blog server start error:", err)

	}
}
