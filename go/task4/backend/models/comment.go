package models

import (
	"errors"

	"gorm.io/gorm"
)

// Comment 评论模型
// 字段：id, content, user_id, post_id, timestamps
type Comment struct {
	BaseModel
	// TODO: 定义字段
	Content string `json:"content" gorm:"not null"`
	UserID  uint   `json:"user_id" gorm:"not null;index"`
	User    *User  `json:"user" gorm:"foreignKey:UserID;references:ID"`
	PostID  uint   `json:"post_id" gorm:"not null;index"`
	Post    *Post  `json:"post" gorm:"foreignKey:PostID;references:ID"`
}

func (c *Comment) TableName() string {
	return "zen_comment"
}

// BeforeCreate 创建前钩子
// 可选：评论创建前的验证逻辑
func (c *Comment) BeforeCreate(tx *gorm.DB) error {
	// TODO: 可选实现验证逻辑
	if c.Content == "" {
		return errors.New("comment content cannot be empty")
	}
	return nil
}
