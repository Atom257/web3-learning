package main

import (
	"fmt"
	"math/rand"
	"sync"
	"time"
)

//题目 ：编写一个程序，使用 go 关键字启动两个协程，一个协程打印从1到10的奇数，另一个协程打印从2到10的偶数。
//考察点 ： go 关键字的使用、协程的并发执行。

func printNum() {
	var wg sync.WaitGroup
	wg.Add(2)
	go func() {
		defer wg.Done()
		for i := 0; i <= 10; i++ {
			if i%2 != 0 {
				fmt.Println("奇数协程：", i)
			}
		}
	}()

	go func() {
		defer wg.Done()
		for i := 0; i <= 10; i++ {
			if i%2 == 0 {
				fmt.Println("偶数协程：", i)
			}
		}
	}()
	wg.Wait()
}

func printNum2() {
	var wg sync.WaitGroup
	wg.Add(2)

	oddChan := make(chan bool)
	evenChan := make(chan bool)

	go func() {
		defer wg.Done()
		for i := 1; i <= 9; i += 2 {
			<-oddChan
			fmt.Println("奇数协程：", i)
			evenChan <- true
		}

	}()

	go func() {
		defer wg.Done()
		for i := 2; i <= 10; i += 2 {
			_, ok := <-evenChan
			if !ok {
				return
			}
			fmt.Println("偶数协程：", i)
			if i < 10 {
				oddChan <- true
			}
		}
	}()

	oddChan <- true // 启动奇数协程

	wg.Wait()
}

//题目 ：设计一个任务调度器，接收一组任务（可以用函数表示），并使用协程并发执行这些任务，同时统计每个任务的执行时间。
//考察点 ：协程原理、并发任务调度。

func taskSchedule(tasks []string) {
	r := rand.New(rand.NewSource(12345)) // 固定种子

	if len(tasks) == 0 {
		return
	}
	var wg sync.WaitGroup
	wg.Add(len(tasks))

	for _, task := range tasks {
		go func(t string) {
			defer wg.Done()
			startTime := time.Now()
			for i := 1; i <= 5; i++ {
				delay := time.Duration(r.Intn(500)) * time.Millisecond
				time.Sleep(delay)
			}
			endTime := time.Now()
			fmt.Printf("任务：%s,运行了 %.2f 秒\n", t, endTime.Sub(startTime).Seconds())

		}(task)
	}
	wg.Wait()
}

func main() {
	//printNum()
	//printNum2()

	tasks := []string{"task1", "task2", "task3", "task4", "task5"}
	taskSchedule(tasks)
	//任务：task2,运行了 0.97 秒
	//任务：task5,运行了 1.03 秒
	//任务：task3,运行了 1.10 秒
	//任务：task4,运行了 1.21 秒
	//任务：task1,运行了 1.29 秒
}
