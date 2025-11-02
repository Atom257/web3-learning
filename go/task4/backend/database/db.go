package database

import (
	"blog/config"
	"blog/models"
	"fmt"

	"github.com/glebarez/sqlite"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"gorm.io/gorm/schema"
)

// DB 全局数据库连接
var DB *gorm.DB

// InitDB 初始化数据库连接
// 根据配置连接 MySQL 或 SQLite 数据库
func InitDB(cfg *config.DatabaseConfig) error {
	switch cfg.Type {
	case "sqlite":
		db, err := gorm.Open(sqlite.Open(cfg.Name), &gorm.Config{
			Logger:                 logger.Default.LogMode(logger.Info),
			SkipDefaultTransaction: true,
			NamingStrategy: schema.NamingStrategy{
				SingularTable: true,
			},
		})
		if err != nil {
			return err
		}
		DB = db

	case "mysql":
		dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
			cfg.User, cfg.Password, cfg.Host, cfg.Port, cfg.Name)

		db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
			Logger:                 logger.Default.LogMode(logger.Info),
			SkipDefaultTransaction: true,
			NamingStrategy: schema.NamingStrategy{
				SingularTable: true,
			},
		})
		if err != nil {
			return err
		}
		DB = db
	default:

		return fmt.Errorf("unsupported database type: %s", cfg.Type)
	}

	return nil
}

// InitTable 自动迁移表结构
// 根据模型自动创建或更新数据库表
func InitTable() error {
	//  实现自动迁移逻辑
	// 迁移 User, Post, Comment 模型
	err := DB.AutoMigrate(&models.User{}, &models.Post{}, &models.Comment{})
	if err != nil {
		return err
	}
	return nil
}
