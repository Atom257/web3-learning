package config

import (
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/joho/godotenv"
)

var (
	once         sync.Once
	globalConfig Config
)

// DatabaseConfig 数据库配置
type DatabaseConfig struct {
	Type     string // 数据库类型: "mysql" 或 "sqlite"
	Host     string // 数据库主机地址（MySQL）
	Port     string // 数据库端口（MySQL）
	User     string // 数据库用户名（MySQL）
	Password string // 数据库密码（MySQL）
	Name     string // 数据库名称（MySQL）或 SQLite 文件路径
}

// JWTConfig JWT 配置
type JWTConfig struct {
	Secret     string        // JWT 密钥
	ExpireTime time.Duration // Token 过期时间
}

// ServerConfig 服务器配置
type ServerConfig struct {
	Host string // 服务器监听地址
	Port string // 服务器端口
}

// Config 配置结构体
// 包含数据库连接信息、JWT密钥、服务器端口等配置
type Config struct {
	Database DatabaseConfig // 数据库配置
	JWT      JWTConfig      // JWT 配置
	Server   ServerConfig   // 服务器配置
}

// LoadConfig 加载配置
// 从环境变量或 .env 文件加载配置信息，如果环境变量不存在则使用默认值
func LoadConfig() Config {
	once.Do(func() {
		// 尝试加载 .env 文件（如果存在）
		_ = godotenv.Load(".env")

		// 加载数据库配置
		database := DatabaseConfig{
			Type:     getEnv("DB_TYPE", "sqlite"),    // 默认使用 SQLite
			Host:     getEnv("DB_HOST", "localhost"), // MySQL 主机
			Port:     getEnv("DB_PORT", "3306"),      // MySQL 端口
			User:     getEnv("DB_USER", "root"),      // MySQL 用户名
			Password: getEnv("DB_PASSWORD", ""),      // MySQL 密码
			Name:     getEnv("DB_NAME", "blog.db"),   // SQLite 文件路径或 MySQL 数据库名
		}

		// 加载 JWT 配置
		expireHours, _ := strconv.Atoi(getEnv("JWT_EXPIRE_HOURS", "24")) // 默认 24 小时
		jwt := JWTConfig{
			Secret:     getEnv("JWT_SECRET", "secret"),         // JWT 密钥
			ExpireTime: time.Duration(expireHours) * time.Hour, // Token 过期时间
		}

		// 加载服务器配置
		server := ServerConfig{
			Host: getEnv("SERVER_HOST", "localhost"), // 默认监听所有接口
			Port: getEnv("SERVER_PORT", "8080"),      // 默认端口 8080
		}

		globalConfig = Config{
			Database: database,
			JWT:      jwt,
			Server:   server,
		}
	})

	return globalConfig
}

// getEnv 获取环境变量，如果不存在则返回默认值
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
