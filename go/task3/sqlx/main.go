package main

import (
	"fmt"
	"log"

	"github.com/jmoiron/sqlx"
	_ "modernc.org/sqlite"
)

var DB *sqlx.DB

//题目1：使用SQL扩展库进行查询
//假设你已经使用Sqlx连接到一个数据库，并且有一个 employees 表，包含字段 id 、 name 、 department 、 salary 。
//要求 ：
//编写Go代码，使用Sqlx查询 employees 表中所有部门为 "技术部" 的员工信息，并将结果映射到一个自定义的 Employee 结构体切片中。
//编写Go代码，使用Sqlx查询 employees 表中工资最高的员工信息，并将结果映射到一个 Employee 结构体中。

func connectDatabase() {

	db, err := sqlx.Connect("sqlite", "./sqlite.db")
	if err != nil {
		log.Fatal("数据库连接失败：", err)
	}
	DB = db
	fmt.Println("✅ SQLite 连接成功", DB.DriverName())

}

// 编写Go代码，使用Sqlx查询 employees 表中所有部门为 "技术部" 的员工信息，并将结果映射到一个自定义的 Employee 结构体切片中。
// 编写Go代码，使用Sqlx查询 employees 表中工资最高的员工信息，并将结果映射到一个 Employee 结构体中。

type Employee struct {
	ID         uint64  `db:"id"`
	Name       string  `db:"name"`
	Department string  `db:"department"`
	Salary     float64 `db:"salary"`
}

func createTableEmployee() error {
	sql := `
	CREATE TABLE IF NOT EXISTS employees (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT,
		department TEXT,
		salary REAL
	);
	`

	exec, err := DB.Exec(sql)
	if err != nil {
		return err
	}
	fmt.Println(exec.RowsAffected())

	return nil
}
func insertEmployeeData() {
	employees := []Employee{
		{Name: "张三", Department: "技术部", Salary: 18000},
		{Name: "李四", Department: "技术部", Salary: 21000},
		{Name: "王五", Department: "市场部", Salary: 15000},
		{Name: "赵六", Department: "行政部", Salary: 9000},
	}
	query := `INSERT INTO employees (name, department, salary) VALUES  `
	params := []interface{}{}
	for i, emp := range employees {
		query += " ( ?,?,?) "
		if i < len(employees)-1 {
			query += ","
		}
		params = append(params, emp.Name, emp.Department, emp.Salary)
	}
	fmt.Println(query)
	fmt.Println(params)

	_, err := DB.Exec(query, params...)
	if err != nil {
		log.Fatal("批量插入失败:", err)
		return
	}
	fmt.Println("✅ 批量插入完成")
}

func sqlxTest1() {
	err := createTableEmployee()
	if err != nil {
		return
	}
	_, err = DB.Exec("DELETE FROM employees")
	if err != nil {
		return
	}
	insertEmployeeData()

	var its []Employee
	err = DB.Select(&its, "SELECT * FROM employees WHERE department = '技术部' ;")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("技术部员工信息：", its)

	var itMostSalary Employee
	err = DB.Get(&itMostSalary, "SELECT * FROM employees WHERE department = '技术部'  ORDER BY  salary DESC LIMIT 1 ;")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("技术部工资最高的员工信息：", itMostSalary)
}

// 题目2：实现类型安全映射
// 假设有一个 books 表，包含字段 id 、 title 、 author 、 price 。
// 要求 ：
// 定义一个 Book 结构体，包含与 books 表对应的字段。
// 编写Go代码，使用Sqlx执行一个复杂的查询，例如查询价格大于 50 元的书籍，并将结果映射到 Book 结构体切片中，确保类型安全。
type Books struct {
	ID     uint64  `db:"id"`
	Title  string  `db:"title"`
	Author string  `db:"author"`
	Price  float64 `db:"price"`
}

func createTableBooks() {
	sql := `
	CREATE TABLE IF NOT EXISTS books (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		title TEXT,
		author TEXT,
		price REAL
	);
	`

	_, err := DB.Exec(sql)
	if err != nil {
		fmt.Println("创建表格books失败：", err)
		return
	}
	fmt.Println("创建表格books成功")

}
func insertBooksData() error {
	books := []Books{
		{Title: "红楼梦", Author: "曹雪芹", Price: 66.80},
		{Title: "三国演义", Author: "罗贯中", Price: 55.00},
		{Title: "水浒传", Author: "施耐庵", Price: 49.90},
		{Title: "西游记", Author: "吴承恩", Price: 45.50},
		{Title: "活着", Author: "余华", Price: 39.80},
		{Title: "三体", Author: "刘慈欣", Price: 76.00},
		{Title: "解忧杂货店", Author: "东野圭吾", Price: 49.50},
		{Title: "小王子", Author: "安东尼·德·圣-埃克苏佩里", Price: 32.00},
		{Title: "围城", Author: "钱钟书", Price: 58.00},
		{Title: "平凡的世界", Author: "路遥", Price: 89.90},
	}

	query := `INSERT INTO books (title, author, price) VALUES  `
	params := []interface{}{}
	for i, book := range books {
		query += " ( ?,?,?) "
		if i < len(books)-1 {
			query += ","
		}
		params = append(params, book.Title, book.Author, book.Price)
	}
	fmt.Println(query)
	fmt.Println(params)

	_, err := DB.Exec(query, params...)
	if err != nil {
		log.Fatal("批量插入失败:", err)
		return err
	}
	fmt.Println("✅ 批量插入完成")
	return nil
}
func sqlxTest2() {
	createTableBooks()

	_, err := DB.Exec("DELETE FROM books")
	if err != nil {
		return
	}

	err = insertBooksData()
	if err != nil {
		fmt.Println(err)
		return
	}

	var books50 []Books
	err = DB.Select(&books50, "SELECT * FROM books WHERE price > 50 ORDER BY price;")

	if err != nil {
		log.Fatal(err)
	}
	for _, b := range books50 {
		fmt.Printf("%d | %s | %s | %.2f\n", b.ID, b.Title, b.Author, b.Price)
	}
}
func main() {
	connectDatabase()

	//sqlxTest1()
	sqlxTest2()
}
