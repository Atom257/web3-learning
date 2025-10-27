package main

import (
	"fmt"
	"math"
)

// 题目 ：定义一个 Shape 接口，包含 Area() 和 Perimeter() 两个方法。
// 然后创建 Rectangle 和 Circle 结构体，实现 Shape 接口。
// 在主函数中，创建这两个结构体的实例，并调用它们的 Area() 和 Perimeter() 方法。
// 考察点 ：接口的定义与实现、面向对象编程风格。

type Shape interface {
	Area() float64
	Perimeter() float64
}

// 定义结构体
type Rectangle struct {
	height float64
	width  float64
}

type Circle struct {
	radius float64
}

// 实现接口
func (rect *Rectangle) Area() float64 {
	return rect.height * rect.width
}

func (rect *Rectangle) Perimeter() float64 {
	return 2 * (rect.height + rect.width)
}

func (circle *Circle) Area() float64 {
	return math.Pi * circle.radius * circle.radius
}

func (circle *Circle) Perimeter() float64 {
	return 2 * math.Pi * circle.radius
}

func printShapeAll(shapes []Shape) {
	for _, s := range shapes {

		switch shape := s.(type) {
		case *Rectangle:
			fmt.Printf("[Rectangle] Area: %.2f, Perimeter: %.2f (w=%.0f,h=%.0f)\n",
				shape.Area(), shape.Perimeter(), shape.width, shape.height)
		case *Circle:
			fmt.Printf("[Circle]    Area: %.2f, Perimeter: %.2f (r=%.0f)\n",
				shape.Area(), shape.Perimeter(), shape.radius)

		}
	}
}

func printShapeInfo() {
	//var shape Shape
	//shape = &Rectangle{10, 20}
	//fmt.Printf("Rectangle-area: %.2f\n", shape.Area())
	//fmt.Printf("Rectangle-perimeter: %.2f\n", shape.Perimeter())
	//
	//shape = &Circle{10}
	//fmt.Printf("circle-area: %.2f\n", shape.Area())
	//fmt.Printf("circle-perimeter: %.2f\n", shape.Perimeter())

	shapes := []Shape{
		&Rectangle{height: 10, width: 10},
		&Circle{radius: 5},
	}
	printShapeAll(shapes)
}

//题目 ：使用组合的方式创建一个 Person 结构体，包含 Name 和 Age 字段，
//再创建一个 Employee 结构体，组合 Person 结构体并添加 EmployeeID 字段。
//为 Employee 结构体实现一个 PrintInfo() 方法，输出员工的信息。
//考察点 ：组合的使用、方法接收者。

type Person struct {
	Name string
	Age  int
}

type Employee struct {
	Person
	EmployeeID string
}

func (e *Employee) PrintInfo() {
	fmt.Printf("员工信息：\n姓名：%s\n年龄：%d\n工号：%s\n",
		e.Name, e.Age, e.EmployeeID)

}

func printPersonInfo() {
	employee := &Employee{
		Person: Person{
			Name: "Tomi",
			Age:  20,
		},
		EmployeeID: "IT001",
	}
	employee.PrintInfo()
}
func main() {
	printShapeInfo()
	//Rectangle-area: 200.00
	//Rectangle-perimeter: 60.00
	//circle-area: 314.16
	//circle-perimeter: 62.83

	printPersonInfo()
	//员工信息：
	//姓名：Tomi
	//年龄：20
	//工号：IT001
}
