package main

import (
	"encoding/json"
	"fmt"

	"github.com/glebarez/sqlite"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func connectDatabaseSqlite() {
	dsn := "task3.db"
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		panic(err)
	}
	DB = db
}

// 题目1：基本CRUD操作
// 假设有一个名为 students 的表，包含字段 id （主键，自增）、 name （学生姓名，字符串类型）、
// age （学生年龄，整数类型）、 grade （学生年级，字符串类型）。
// 要求 ：
// 编写SQL语句向 students 表中插入一条新记录，学生姓名为 "张三"，年龄为 20，年级为 "三年级"。
// 编写SQL语句查询 students 表中所有年龄大于 18 岁的学生信息。
// 编写SQL语句将 students 表中姓名为 "张三" 的学生年级更新为 "四年级"。
// 编写SQL语句删除 students 表中年龄小于 15 岁的学生记录。
type Students struct {
	ID    uint64 `gorm:"column:stu_id;primary_key;auto_increment"`
	Name  string `gorm:"column:stu_name;size:255;not null;index;"`
	Age   uint   `gorm:"column:stu_age;size:5;default:6;check:(stu_age > 0);not null;index;"`
	Grade string `gorm:"column:stu_grade;size:50;not null;index;"`
}

func sqlTest1() {

	//students 表中插入一条新记录，学生姓名为 "张三"，年龄为 20，年级为 "三年级"。
	var students = &Students{
		Name:  "张三",
		Age:   20,
		Grade: "三年级",
	}
	res := DB.Create(&students)
	if res.Error != nil {
		fmt.Println("插入数据失败：", res.Error)
	} else {
		fmt.Println("插入数据成功：", *students)
	}
	// 编写SQL语句查询 students 表中所有年龄大于 18 岁的学生信息。

	var students18 []Students
	res = DB.Model(&students).Where("stu_age > ?", 18).Find(&students18)
	if res.Error != nil {
		fmt.Println("查询失败", res.Error)
	} else {
		jsonData, _ := json.Marshal(students18)
		fmt.Println("大于18岁学生信息：", string(jsonData))
	}

	// 编写SQL语句将 students 表中姓名为 "张三" 的学生年级更新为 "四年级"。
	res = DB.Model(&students).Where("stu_name > ?", "张三").Updates(map[string]interface{}{
		"Grade": "四年级",
	})
	if res.Error != nil {
		fmt.Println("更新失败：", res.Error)
	} else {
		fmt.Println("更新成功，受影响行数:", res.RowsAffected)
	}
	// 编写SQL语句删除 students 表中年龄小于 15 岁的学生记录。
	res = DB.Model(&students).Where("stu_age < ?", 15).Delete(&students)
	if res.Error != nil {
		fmt.Println("删除失败:", res.Error)
	} else {
		fmt.Println("删除成功，受影响行数:", res.RowsAffected)
	}
}

//题目2：事务语句
//假设有两个表： accounts 表（包含字段 id 主键， balance 账户余额）和
//transactions 表（包含字段 id 主键， from_account_id 转出账户ID， to_account_id 转入账户ID， amount 转账金额）。
//要求 ：
//编写一个事务，实现从账户 A 向账户 B 转账 100 元的操作。
//在事务中，需要先检查账户 A 的余额是否足够，如果足够则从账户 A 扣除 100 元，向账户 B 增加 100 元，
//并在 transactions 表中记录该笔转账信息。如果余额不足，则回滚事务。

type Accounts struct {
	ID      uint64          `gorm:"column:account_id;primary_key"`
	Name    string          `gorm:"column:account_name;size:255;unique;"`
	Balance decimal.Decimal `gorm:"column:account_balance;type:decimal(12,2);not null;default:0.00;"`
}

type Transactions struct {
	ID            uint64          `gorm:"column:account_id;primary_key;auto_increment"`
	FromAccountID uint64          `gorm:"column:from_account_id;not null;index;"`
	ToAccountID   uint64          `gorm:"column:to_account_id;not null;index;"`
	Amount        decimal.Decimal `gorm:"column:amount;type:decimal(12,2);not null;default:0.00;"`
}

func sqlTest2() {
	// 创建账户A,B

	var accounts = []Accounts{
		{ID: 1, Name: "A", Balance: decimal.NewFromFloat(150.12)},
		{ID: 2, Name: "B", Balance: decimal.NewFromFloat(2.00)},
	}
	if err := DB.Create(&accounts).Error; err != nil {
		fmt.Println("创建账号失败：", err)
	} else {
		fmt.Println("创建账号成功，创建条数：", len(accounts))
	}

	//编写一个事务，实现从账户 A 向账户 B 转账 100 元的操作。
	//在事务中，需要先检查账户 A 的余额是否足够，如果足够则从账户 A 扣除 100 元，向账户 B 增加 100 元，
	//并在 transactions 表中记录该笔转账信息。如果余额不足，则回滚事务。

	var accountA Accounts
	var accountB Accounts
	if err := DB.Model(&Accounts{}).Where("account_name = ?", "A").First(&accountA).Error; err != nil {
		fmt.Println("账户A不存在")
		return
	}
	if err := DB.Model(&Accounts{}).Where("account_name = ?", "B").First(&accountB).Error; err != nil {
		fmt.Println("账户B不存在")
		return
	}
	res := DB.Transaction(func(tx *gorm.DB) error {
		var accountA, accountB Accounts
		if err := tx.Where("account_name = ?", "A").First(&accountA).Error; err != nil {
			return err
		}

		if accountA.Balance.LessThan(decimal.NewFromFloat(100.00)) {
			return fmt.Errorf("账户A余额不足：%s", accountA.Balance.StringFixed(2))

		}
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("account_name = ?", "B").
			First(&accountB).Error; err != nil {
			return err
		}
		if err := tx.Model(&Accounts{}).
			Where("account_name = ?", "A").
			Update("account_balance", gorm.Expr("account_balance - ?", 100)).Error; err != nil {
			return err
		}
		if err := tx.Model(&Accounts{}).
			Where("account_name = ?", "B").
			Update("account_balance", gorm.Expr("account_balance + ?", 100)).Error; err != nil {
			return err
		}

		return nil
	})
	if res != nil {
		fmt.Println("交易失败：", res)
	} else {
		fmt.Println("事务已提交 ✅")
	}

}

func main() {

	connectDatabaseSqlite()
	err := DB.AutoMigrate(&Students{}, &Transactions{}, &Accounts{})
	if err != nil {
		fmt.Println("创建表格失败：", err)
	}
	fmt.Printf(DB.Name())

	//sqlTest1()
	//sqlTest2()
}
