package handlers

import (
	"blog/database"
	"blog/models"
	"blog/utils"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"
)

// validateRegisterInput 验证注册输入
// 验证用户名、邮箱格式和密码长度
func validateRegisterInput(name, email, password string) string {
	// 验证用户名
	name = strings.TrimSpace(name)
	if name == "" {
		return "用户名不能为空"
	}
	if len(name) < 3 {
		return "用户名长度至少3个字符"
	}
	if len(name) > 20 {
		return "用户名长度不能超过20个字符"
	}

	// 验证邮箱
	email = strings.TrimSpace(email)
	if email == "" {
		return "邮箱不能为空"
	}
	// 邮箱格式验证正则表达式
	emailRegex := regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)
	if !emailRegex.MatchString(email) {
		return "邮箱格式不正确"
	}

	// 验证密码
	if password == "" {
		return "密码不能为空"
	}
	if len(password) < 6 {
		return "密码长度至少6位"
	}
	if len(password) > 100 {
		return "密码长度不能超过100位"
	}

	return "" // 返回空字符串表示验证通过
}

// Register 用户注册
// 处理用户注册请求：验证输入、加密密码、创建用户
func Register(c *gin.Context) {
	//  实现注册逻辑
	// 1. 解析请求体
	var registerReq struct {
		Name     string `json:"name" binding:"required"`
		Password string `json:"password" binding:"required"`
		Email    string `json:"email" binding:"required"`
	}
	if err := c.ShouldBind(&registerReq); err != nil {
		utils.Error(c, utils.CodeBadRequest, err.Error())
		return
	}

	// 2. 验证输入（用户名、邮箱、密码）
	if errMsg := validateRegisterInput(registerReq.Name, registerReq.Email, registerReq.Password); errMsg != "" {
		utils.Error(c, utils.CodeBadRequest, errMsg)
		return
	}

	// 3. 检查用户名和邮箱是否已存在
	var count int64
	database.DB.Model(&models.User{}).
		Where("name = ? ", registerReq.Name).Count(&count)
	if count > 0 {
		utils.Error(c, utils.CodeConflict, utils.MsgUsernameExists)
		return
	}
	database.DB.Model(&models.User{}).
		Where("email = ? ", registerReq.Email).Count(&count)
	if count > 0 {
		utils.Error(c, utils.CodeConflict, utils.MsgEmailExists)
		return
	}

	//  4. 创建用户记录（密码加密由 User 模型的 BeforeCreate 钩子自动处理）
	user := models.User{
		Name:     registerReq.Name,
		Email:    registerReq.Email,
		Password: registerReq.Password,
	}
	err := database.DB.Create(&user).Error
	if err != nil {
		utils.Error(c, utils.CodeInternalError, err.Error())
		return
	}
	utils.Success(c, map[string]interface{}{
		"id":    user.ID,
		"name":  user.Name,
		"email": user.Email,
	})
}

// Login 用户登录
// 处理用户登录请求：验证用户名密码、生成JWT Token
func Login(c *gin.Context) {
	//  登录逻辑
	// 1. 解析请求体（用户名、密码）
	var loginReq struct {
		Name     string `json:"name"  binding:"required"`
		Password string `json:"password"   binding:"required"`
	}

	if err := c.ShouldBindJSON(&loginReq); err != nil {
		utils.Error(c, utils.CodeBadRequest, err.Error())
		return
	}
	// 2. 查询用户
	var existUser models.User
	result := database.DB.Model(&models.User{}).Where("name = ? ", loginReq.Name).First(&existUser)
	if result.Error != nil {
		utils.Error(c, utils.CodeUnauthorized, utils.MsgLoginFailed)
		return
	}
	// 3. 验证密码
	if !utils.CheckPassword(loginReq.Password, existUser.Password) {
		utils.Error(c, utils.CodeUnauthorized, utils.MsgLoginFailed)
		return
	}
	// 4. 生成JWT Token
	token, err := utils.GenerateToken(existUser.ID)
	if err != nil {
		utils.Error(c, utils.CodeForbidden, utils.MsgNoPermission)
		return
	}
	// 5. 返回Token和用户信息
	utils.Success(c, map[string]interface{}{
		"token": token,
		"user": map[string]interface{}{
			"id":    existUser.ID,
			"name":  existUser.Name,
			"email": existUser.Email,
		},
	})
}
