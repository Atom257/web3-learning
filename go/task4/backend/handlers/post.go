package handlers

import (
	"blog/database"
	"blog/middleware"
	"blog/models"
	"blog/utils"

	"strings"

	"github.com/gin-gonic/gin"
)

// CreatePost 创建文章
// 只有已认证的用户才能创建文章
func CreatePost(c *gin.Context) {
	// 创建文章逻辑

	// 1. 从上下文获取当前用户ID（通过中间件）
	userId, exists := middleware.GetUserFromContext(c)
	if !exists {
		utils.Error(c, utils.CodeForbidden, utils.MsgNoPermission)
		return
	}
	// 2. 解析请求体（标题、内容）
	var createPostReq struct {
		Title   string `json:"title"  binding:"required"`
		Content string `json:"content"   binding:"required"`
	}
	err := c.BindJSON(&createPostReq)
	if err != nil {
		utils.Error(c, utils.CodeBadRequest, utils.MsgBadRequest)
		return
	}
	// 3. 验证输入
	createPostReq.Title = strings.TrimSpace(createPostReq.Title)
	createPostReq.Content = strings.TrimSpace(createPostReq.Content)

	if createPostReq.Title == "" {
		utils.Error(c, utils.CodeBadRequest, "标题不能为空")
		return
	}
	if len(createPostReq.Title) < 2 {
		utils.Error(c, utils.CodeBadRequest, "标题长度至少2个字符")
		return
	}
	if len(createPostReq.Title) > 100 {
		utils.Error(c, utils.CodeBadRequest, "标题长度不能超过100个字符")
		return
	}

	if createPostReq.Content == "" {
		utils.Error(c, utils.CodeBadRequest, "内容不能为空")
		return
	}
	if len(createPostReq.Content) < 10 {
		utils.Error(c, utils.CodeBadRequest, "内容长度至少10个字符")
		return
	}
	if len(createPostReq.Content) > 10000 {
		utils.Error(c, utils.CodeBadRequest, "内容长度不能超过10000个字符")
		return
	}
	// 4. 创建文章记录
	post := &models.Post{
		UserID:  userId,
		Title:   createPostReq.Title,
		Content: createPostReq.Content,
	}
	result := database.DB.Create(&post)
	if result.Error != nil {
		utils.Error(c, utils.CodeInternalError, utils.MsgInternalError)
		return
	}
	// 5. 返回响应
	utils.Success(c, gin.H{
		"post_id": post.ID,
		"title":   createPostReq.Title,
	})
}

// GetPosts 获取所有文章列表
// 公开接口，返回所有文章
func GetPosts(c *gin.Context) {
	//  获取文章列表逻辑
	// 1. 查询所有文章（关联用户信息）
	var postReq struct {
		Page     int `form:"page"`
		PageSize int `form:"page_size"`
	}
	_ = c.ShouldBindQuery(&postReq)

	page := postReq.Page
	if page < 1 {
		page = 1
	}
	pageSize := postReq.PageSize
	if pageSize < 1 {
		pageSize = 10 // 默认每页10条
	}
	if pageSize > 50 {
		pageSize = 50 // 最大每页50条
	}

	offset := (page - 1) * pageSize
	var total int64
	database.DB.Model(&models.Post{}).Count(&total)
	// 2. 可选：分页、排序
	var posts []models.Post
	result := database.DB.Preload("User").
		Order("created_at DESC").
		Offset(offset).
		Limit(pageSize).
		Find(&posts)

	if result.Error != nil {
		utils.Error(c, utils.CodeInternalError, utils.MsgInternalError)
		return
	}
	// 3. 返回文章列表
	utils.Success(c, gin.H{
		"posts": posts,
		"pagination": gin.H{
			"page":       page,
			"page_size":  pageSize,
			"total":      total,
			"total_page": (int(total) + pageSize - 1) / pageSize,
		},
	})
}

// GetPost 获取单篇文章详情
// 公开接口，根据ID获取文章详情
func GetPost(c *gin.Context) {
	// 获取文章详情逻辑
	// 1. 获取URL参数中的文章ID
	var postReq struct {
		ID int `uri:"id" binding:"required"`
	}
	err := c.ShouldBindUri(&postReq)
	if err != nil {
		utils.Error(c, utils.CodeNotFound, utils.MsgPostNotFound)
		return
	}
	// 2. 检查文章是否存在
	var count int64
	database.DB.Model(&models.Post{}).Where("id = ? ", postReq.ID).Count(&count)
	if count == 0 {
		utils.Error(c, utils.CodeNotFound, utils.MsgPostNotFound)
		return
	}
	// 3. 查询文章（关联用户信息）
	var post models.Post
	result := database.DB.Preload("User").Where("id = ? ", postReq.ID).First(&post)
	if result.Error != nil {
		utils.Error(c, utils.CodeNotFound, utils.MsgPostNotFound)
		return
	}
	// 4. 返回文章详情
	utils.Success(c, gin.H{
		"post": post,
	})
}

// UpdatePost 更新文章
// 只有文章的作者才能更新自己的文章（需认证+作者权限）
func UpdatePost(c *gin.Context) {
	// 更新文章逻辑
	// 1. 获取文章ID
	var getReq struct {
		ID int `uri:"id" binding:"required"`
	}
	err := c.ShouldBindUri(&getReq)
	if err != nil {
		utils.Error(c, utils.CodeNotFound, utils.MsgPostNotFound)
		return
	}
	// 2. 从上下文获取当前用户ID
	userId, exists := middleware.GetUserFromContext(c)
	if !exists {
		utils.Error(c, utils.CodeForbidden, utils.MsgNoPermission)
		return
	}
	// 3. 查询文章并验证是否为作者
	var post models.Post
	result := database.DB.Where("id = ? ", getReq.ID).First(&post)
	if result.Error != nil {
		utils.Error(c, utils.CodeNotFound, utils.MsgPostNotFound)
		return
	}
	if post.UserID != userId {
		utils.Error(c, utils.CodeForbidden, utils.MsgNoPermission)
		return
	}

	var updatePostReq struct {
		Title   string `json:"title"  binding:"required"`
		Content string `json:"content"   binding:"required"`
	}
	err = c.ShouldBindJSON(&updatePostReq)
	if err != nil {
		utils.Error(c, utils.CodeBadRequest, utils.MsgBadRequest)
		return
	}

	// 在解析请求体后添加验证
	updatePostReq.Title = strings.TrimSpace(updatePostReq.Title)
	updatePostReq.Content = strings.TrimSpace(updatePostReq.Content)

	if updatePostReq.Title == "" {
		utils.Error(c, utils.CodeBadRequest, "标题不能为空")
		return
	}
	if len(updatePostReq.Title) < 2 || len(updatePostReq.Title) > 100 {
		utils.Error(c, utils.CodeBadRequest, "标题长度必须在2-100个字符之间")
		return
	}

	if updatePostReq.Content == "" {
		utils.Error(c, utils.CodeBadRequest, "内容不能为空")
		return
	}
	if len(updatePostReq.Content) < 10 || len(updatePostReq.Content) > 10000 {
		utils.Error(c, utils.CodeBadRequest, "内容长度必须在10-10000个字符之间")
		return
	}

	// 4. 解析请求体（标题、内容）更新文章记录
	result = database.DB.Model(&models.Post{}).
		Where("id = ? ", post.ID).
		Updates(map[string]interface{}{
			"title":   updatePostReq.Title,
			"content": updatePostReq.Content,
		})
	if result.Error != nil {
		utils.Error(c, utils.CodeInternalError, utils.MsgInternalError)
		return
	}
	// 5. 返回响应
	utils.Success(c, gin.H{
		"msg": utils.MsgSuccess,
	})
}

// DeletePost 删除文章
// 只有文章的作者才能删除自己的文章（需认证+作者权限）
func DeletePost(c *gin.Context) {
	// TODO: 实现删除文章逻辑
	// 1. 获取文章ID
	var getReq struct {
		ID int `uri:"id" binding:"required"`
	}
	err := c.ShouldBindUri(&getReq)
	if err != nil {
		utils.Error(c, utils.CodeNotFound, utils.MsgPostNotFound)
		return
	}
	// 2. 从上下文获取当前用户ID
	userId, exists := middleware.GetUserFromContext(c)
	if !exists {
		utils.Error(c, utils.CodeForbidden, utils.MsgNoPermission)
		return
	}
	// 3. 查询文章并验证是否为作者
	var post models.Post
	result := database.DB.Where("id = ? ", getReq.ID).First(&post)
	if result.Error != nil {
		utils.Error(c, utils.CodeNotFound, utils.MsgPostNotFound)
		return
	}
	if post.UserID != userId {
		utils.Error(c, utils.CodeForbidden, utils.MsgNoPermission)
		return
	}
	// 4. 删除文章记录
	result = database.DB.Delete(&post)
	// 5. 返回响应
	if result.Error != nil {
		utils.Error(c, utils.CodeNotFound, utils.MsgPostNotFound)
		return
	}
	utils.Success(c, gin.H{
		"msg": utils.MsgSuccess,
	})
}
