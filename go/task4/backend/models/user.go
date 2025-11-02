package models

import (
	"blog/utils"
	"errors"

	"gorm.io/gorm"
)

// User 用户模型
// 字段：id, username, password, email, timestamps
type User struct {
	BaseModel
	// TODO: 定义字段
	Name     string `json:"name" gorm:"uniqueIndex;not null"`
	Password string `json:"-" gorm:"not null;"`
	Email    string `json:"email" gorm:"uniqueIndex"`

	//文章
	Posts []Post `json:"posts" gorm:"foreignKey:UserID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL;"`
	//评论
	Comments []Comment `json:"comments" gorm:"foreignKey:UserID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL;"`
}

func (u *User) TableName() string {
	return "zen_user"
}

// BeforeCreate 创建前钩子
// 在创建用户前对密码进行加密
func (u *User) BeforeCreate(tx *gorm.DB) error {
	//   实现密码加密逻辑
	var err error
	u.Password, err = utils.HashPassword(u.Password)
	if err != nil {
		return errors.New("bcrypt password error")
	}
	return nil
}
