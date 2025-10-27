package main

import (
	"fmt"
	"sync"
)

// 题目 ：编写一个程序，使用通道实现两个协程之间的通信。
//一个协程生成从1到10的整数，并将这些整数发送到通道中，另一个协程从通道中接收这些整数并打印出来。
// 考察点 ：通道的基本使用、协程间通信。

func taskCounterSync() {
	sendChan := make(chan bool)
	receiveChan := make(chan int)

	wg := &sync.WaitGroup{}
	wg.Add(2)

	//生成整数并发送
	go func() {
		defer wg.Done()
		for i := 1; i <= 10; i++ {
			<-sendChan
			receiveChan <- i
		}
		close(receiveChan)
	}()

	//接收整数并打印
	go func() {
		defer wg.Done()
		for num := range receiveChan { // 通道关闭时自动退出循环
			fmt.Println("Num:", num)
			select {
			case sendChan <- true:
			default:
			}
		}

	}()

	sendChan <- true
	wg.Wait()
}

// 题目 ：实现一个带有缓冲的通道，生产者协程向通道中发送100个整数，消费者协程从通道中接收这些整数并打印。
// 考察点 ：通道的缓冲机制。
func taskBufferedChannel() {
	wg := &sync.WaitGroup{}
	wg.Add(2)

	receiveChan := make(chan int, 100) //缓冲量100

	go func() {
		defer wg.Done()
		for i := 1; i <= 100; i++ {
			receiveChan <- i
		}
		close(receiveChan)
	}()

	go func() {
		defer wg.Done()
		for num := range receiveChan {

			fmt.Println("receive Num:", num)
		}
	}()

	wg.Wait()
}

func main() {
	taskCounterSync()
	taskBufferedChannel()
}
