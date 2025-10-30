package main

import (
	"fmt"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var DB *gorm.DB

//题目1：模型定义
//假设你要开发一个博客系统，有以下几个实体： User （用户）、 Post （文章）、 Comment （评论）。
//要求 ：
//使用Gorm定义 User 、 Post 和 Comment 模型，其中 User 与 Post 是一对多关系（一个用户可以发布多篇文章），
//Post 与 Comment 也是一对多关系（一篇文章可以有多个评论）。
//编写Go代码，使用Gorm创建这些模型对应的数据库表。
//题目2：关联查询
//基于上述博客系统的模型定义。
//要求 ：
//编写Go代码，使用Gorm查询某个用户发布的所有文章及其对应的评论信息。
//编写Go代码，使用Gorm查询评论数量最多的文章信息。
//题目3：钩子函数
//继续使用博客系统的模型。
//要求 ：
//为 Post 模型添加一个钩子函数，在文章创建时自动更新用户的文章数量统计字段。
//为 Comment 模型添加一个钩子函数，在评论删除时检查文章的评论数量，如果评论数量为 0，则更新文章的评论状态为 "无评论"。

// 用户
type User struct {
	UserID    uint64         `gorm:"column:user_id;primary_key;auto_increment"`
	UserName  string         `gorm:"column:user_name;size:255;not null;unique"`
	Posts     []Post         `gorm:"foreignKey:UserID;references:UserID"`
	PostCount uint           `gorm:"column:post_count;default:0"`
	CreatedAt time.Time      `gorm:"column:user_created_at;autoCreateTime"`
	UpdatedAt time.Time      `gorm:"column:user_updated_at;autoUpdateTime"`
	DeletedAt gorm.DeletedAt `gorm:"column:user_deleted_at;index;"`
}

// 文章
type Post struct {
	PostID        uint64         `gorm:"column:post_id;primary_key;auto_increment"`
	Title         string         `gorm:"column:post_title;size:255;not null;unique;"`
	Content       string         `gorm:"column:post_content;size:255;not null;"`
	UserID        uint64         `gorm:"column:user_id;index;"`
	Comments      []Comment      `gorm:"foreignKey:PostID;references:PostID"`
	CommentStatus string         `gorm:"column:comment_status;default:'无评论'"`
	CreatedAt     time.Time      `gorm:"column:post_created_at;autoCreateTime"`
	UpdatedAt     time.Time      `gorm:"column:post_updated_at;autoUpdateTime"`
	DeletedAt     gorm.DeletedAt `gorm:"column:post_deleted_at;index;"`
}

// 为 Post 模型添加一个钩子函数，在文章创建时自动更新用户的文章数量统计字段
func (p *Post) AfterCreate(tx *gorm.DB) (err error) {
	return tx.Model(&User{}).Where(" user_id = ? ", p.UserID).
		UpdateColumn("post_count", gorm.Expr("post_count + ?", 1)).Error
}

// 评论
type Comment struct {
	CommentID uint64         `gorm:"column:comment_id;primary_key;auto_increment"`
	Content   string         `gorm:"column:comment_content;size:255;not null;"`
	PostID    uint64         `gorm:"column:post_id;index"`
	CreatedAt time.Time      `gorm:"column:comment_created_at;autoCreateTime"`
	UpdatedAt time.Time      `gorm:"column:comment_updated_at;autoUpdateTime"`
	DeletedAt gorm.DeletedAt `gorm:"column:comment_deleted_at;index;"`
}

// 为 Comment 模型添加一个钩子函数，在评论删除时检查文章的评论数量，如果评论数量为 0，则更新文章的评论状态为 "无评论"。
func (c *Comment) AfterDelete(tx *gorm.DB) (err error) {
	//检查评论数量
	var commentCount int64
	tx.Model(&Comment{}).Where("post_id = ?", c.PostID).Count(&commentCount)

	//更新文章评论状态
	if commentCount == 0 {
		err = tx.Model(&Post{}).Where("post_id = ? ", c.PostID).
			Update("comment_status", "无评论").Error
	}

	return
}
func (c *Comment) AfterCreate(tx *gorm.DB) (err error) {
	//检查评论数量

	err = tx.Model(&Post{}).Where("post_id = ? ", c.PostID).
		Update("comment_status", "有评论").Error

	return
}

func connectDatabase() {
	dsn := "gormTest.db"
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		fmt.Println("connect database error:", err)
		return
	}
	DB = db
	fmt.Println("connect database success", db.Name())
}
func createTable() {
	err := DB.AutoMigrate(&User{}, &Post{}, &Comment{})
	if err != nil {
		fmt.Println("create table error:", err)
		return
	}
	fmt.Println("create table success")
}
func insertData() {
	//模拟user数据
	users := []User{
		{UserName: "Alice"},
		{UserName: "Bob"},
		{UserName: "Charlie"},
	}
	for _, u := range users {
		//DB.Create(&u)
		DB.Clauses(clause.OnConflict{DoNothing: true}).Create(&u)
	}
	//模拟post数据
	posts := []Post{
		{Title: "Go语言入门", Content: "这是一篇 Go 基础教程", UserID: 1},
		{Title: "GORM数据库操作", Content: "介绍GORM的用法", UserID: 1},
		{Title: "Web开发实践", Content: "Gin框架实战分享", UserID: 2},
	}
	for _, p := range posts {
		//DB.Create(&p)
		DB.Clauses(clause.OnConflict{DoNothing: true}).Create(&p)
	}
	//模拟comment数据
	comments := []Comment{
		{Content: "写得太好了！", PostID: 1},
		{Content: "谢谢分享", PostID: 1},
		{Content: "不错不错", PostID: 2},
	}
	for _, c := range comments {
		//DB.Create(&c)
		DB.Clauses(clause.OnConflict{DoNothing: true}).Create(&c)
	}

	fmt.Println("模拟数据插入完成！")
}

func selectData() {
	//用户数据
	var users []User
	result := DB.Find(&users)
	if result.Error != nil {
		fmt.Println("查询出错：", result.Error)
		return
	}
	fmt.Printf("查询到 %d 个用户\n", result.RowsAffected)
	for _, u := range users {
		fmt.Printf("用户ID:%d, 用户名:%s, 文章数:%d\n", u.UserID, u.UserName, u.PostCount)
	}

	//文章数据
	var posts []Post
	result = DB.Find(&posts)
	if result.Error != nil {
		fmt.Println("查询出错：", result.Error)
		return
	}
	fmt.Printf("查询到 %d 篇文章\n", result.RowsAffected)
	for _, c := range posts {
		fmt.Printf("文章ID:%d, 文章标题:%s, 评论状态:%s\n", c.PostID, c.Title, c.CommentStatus)
	}

}
func updateData() {
	var comments []Comment
	DB.Where("post_id = ?", 1).Find(&comments)
	for _, c := range comments {
		DB.Delete(&c) // 逐条删除，触发 AfterDelete
	}
}

func main() {
	//链接数据
	connectDatabase()
	// 建表
	createTable()
	//插入测试数据
	insertData()

	selectData()

	updateData()
	selectData()

	//connect database success sqlite
	//create table success
	//模拟数据插入完成！
	//查询到 3 个用户
	//用户ID:1, 用户名:Alice, 文章数:16
	//用户ID:2, 用户名:Bob, 文章数:8
	//用户ID:3, 用户名:Charlie, 文章数:0

	//查询到 3 篇文章
	//文章ID:1, 文章标题:Go语言入门, 评论状态:有评论
	//文章ID:2, 文章标题:GORM数据库操作, 评论状态:有评论
	//文章ID:3, 文章标题:Web开发实践, 评论状态:无评论

	//查询到 3 个用户
	//用户ID:1, 用户名:Alice, 文章数:16
	//用户ID:2, 用户名:Bob, 文章数:8
	//用户ID:3, 用户名:Charlie, 文章数:0

	//查询到 3 篇文章
	//文章ID:1, 文章标题:Go语言入门, 评论状态:无评论
	//文章ID:2, 文章标题:GORM数据库操作, 评论状态:有评论
	//文章ID:3, 文章标题:Web开发实践, 评论状态:无评论
}
