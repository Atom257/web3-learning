package utils

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// HTTP 状态码常量（与 code 码保持一致，符合 RESTful 规范）
const (
	CodeSuccess       = http.StatusOK                  // 200 - 操作成功
	CodeBadRequest    = http.StatusBadRequest          // 400 - 请求参数错误（如缺少必填字段、格式不正确）
	CodeUnauthorized  = http.StatusUnauthorized        // 401 - 未授权（JWT Token 缺失、无效或过期）
	CodeForbidden     = http.StatusForbidden           // 403 - 禁止访问（无权限，如非作者尝试修改文章）
	CodeNotFound      = http.StatusNotFound            // 404 - 资源不存在（文章、评论、用户不存在）
	CodeConflict      = http.StatusConflict            // 409 - 资源冲突（用户名已存在、邮箱已存在）
	CodeInternalError = http.StatusInternalServerError // 500 - 服务器内部错误（数据库错误、未知错误）
)

// 业务错误消息常量（便于统一错误提示）
const (
	MsgSuccess       = "操作成功"     // CodeSuccess (200)
	MsgBadRequest    = "请求参数错误"   // CodeBadRequest (400)
	MsgUnauthorized  = "未授权，请先登录" // CodeUnauthorized (401)
	MsgForbidden     = "无权限访问"    // CodeForbidden (403)
	MsgNotFound      = "资源不存在"    // CodeNotFound (404)
	MsgConflict      = "资源已存在"    // CodeConflict (409)
	MsgInternalError = "服务器内部错误"  // CodeInternalError (500)

	// 业务相关消息
	MsgUsernameExists  = "用户名已存在"   // CodeConflict (409)
	MsgEmailExists     = "邮箱已存在"    // CodeConflict (409)
	MsgLoginFailed     = "用户名或密码错误" // CodeUnauthorized (401)
	MsgPostNotFound    = "文章不存在"    // CodeNotFound (404)
	MsgCommentNotFound = "评论不存在"    // CodeNotFound (404)
	MsgNoPermission    = "无权限操作此资源" // CodeForbidden (403)
)

// Response 统一响应结构体
type Response struct {
	Code    int         `json:"code"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
}

// Success 成功响应
// 返回统一的成功响应格式
func Success(c *gin.Context, data interface{}) {
	//  实现成功响应逻辑
	c.JSON(CodeSuccess, Response{Code: CodeSuccess, Data: data})

}

// Error 错误响应
// 返回统一的错误响应格式
func Error(c *gin.Context, code int, message string) {
	// 实现错误响应逻辑
	c.JSON(code, Response{Code: code, Message: message})

}
