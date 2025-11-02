package models

import (
	"gorm.io/gorm"
)

// Post 文章模型
// 字段：id, title, content, user_id, timestamps
type Post struct {
	BaseModel
	// TODO: 定义字段
	Title   string `json:"title" gorm:"not null"`
	Content string `json:"content" gorm:"type:text;not null"`
	UserID  uint   `json:"user_id" gorm:"not null;index"`
	User    *User  `json:"user" gorm:"foreignKey:UserID;references:ID"`

	Comments []Comment `json:"comments" gorm:"foreignKey:PostID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL;"`
}

func (p *Post) TableName() string {
	return "zen_post"
}

// AfterCreate 创建后钩子
// 可选：文章创建后的处理逻辑
func (p *Post) AfterCreate(tx *gorm.DB) error {
	// TODO: 可选实现
	return nil
}
