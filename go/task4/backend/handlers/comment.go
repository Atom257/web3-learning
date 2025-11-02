package handlers

import (
	"blog/database"
	"blog/middleware"
	"blog/models"
	"blog/utils"
	"sort"
	"strconv"

	"github.com/gin-gonic/gin"
)

// CreateComment 创建评论
// 已认证的用户可以对文章发表评论
func CreateComment(c *gin.Context) {
	//  创建评论逻辑
	// 1. 从上下文获取当前用户ID（通过中间件）
	userId, exists := middleware.GetUserFromContext(c)
	if !exists {
		utils.Error(c, utils.CodeForbidden, utils.MsgNoPermission)
		return
	}
	// 2. 解析请求体（文章ID、评论内容）
	var commentReq struct {
		PostIdStr string `json:"post_id" binding:"required"`
		Content   string `json:"content" binding:"required"`
	}
	err := c.ShouldBindJSON(&commentReq)
	if err != nil {
		utils.Error(c, utils.CodeBadRequest, utils.MsgBadRequest)
		return
	}
	postId, errs := strconv.ParseUint(commentReq.PostIdStr, 10, 64)
	if errs != nil {
		utils.Error(c, utils.CodeBadRequest, utils.MsgBadRequest)
		return
	}
	// 3. 验证文章是否存在
	var count int64
	database.DB.Model(&models.Post{}).Where("id = ? ", postId).Count(&count)
	if count == 0 {
		utils.Error(c, utils.CodeNotFound, utils.MsgPostNotFound)
		return
	}
	// 4. 验证输入
	// 5. 创建评论记录
	comment := &models.Comment{
		Content: commentReq.Content,
		UserID:  userId,
		PostID:  uint(postId),
	}
	result := database.DB.Create(&comment)
	// 6. 返回响应
	if result.Error != nil {
		utils.Error(c, utils.CodeInternalError, utils.MsgInternalError)
		return
	}
	utils.Success(c, gin.H{
		"msg": utils.MsgSuccess,
	})
}

// GetCommentsByPost 获取文章的所有评论列表
// 公开接口，根据文章ID获取该文章的所有评论
func GetCommentsByPost(c *gin.Context) {
	// 获取评论列表逻辑
	// 1. 获取URL参数中的文章ID
	postId := c.Param("post_id")
	if postId == "" {
		utils.Error(c, utils.CodeBadRequest, utils.MsgPostNotFound)
		return
	}

	// 2. 验证文章是否存在
	var existPost models.Post
	err := database.DB.Where("id = ?", postId).First(&existPost).Error
	if err != nil {
		utils.Error(c, utils.CodeNotFound, utils.MsgNotFound)
		return
	}
	// 3. 查询该文章的所有评论（关联用户信息）
	var comments []models.Comment
	err = database.DB.Where("post_id = ?", postId).Preload("User").Order("created_at DESC ").Find(&comments).Error
	if err != nil {
		utils.Error(c, utils.CodeInternalError, utils.MsgInternalError)
		return
	}

	// 4. 可选：排序（按时间）
	sort.Slice(comments, func(i, j int) bool {
		return comments[i].CreatedAt.After(comments[j].CreatedAt)
	})
	// 5. 返回评论列表
	utils.Success(c, gin.H{
		"comments": comments,
		"count":    len(comments),
	})
}
