package main

import (
	"fmt"
	"sync"
	"sync/atomic"
)

// 题目 ：编写一个程序，使用 sync.Mutex 来保护一个共享的计数器。启动10个协程，
// 每个协程对计数器进行1000次递增操作，最后输出计数器的值。
// 考察点 ： sync.Mutex 的使用、并发数据安全。
func syncCounter() {
	wg := &sync.WaitGroup{}
	wg.Add(10)

	lock := &sync.Mutex{}
	counter := 0

	for i := 0; i < 10; i++ {
		go func(id int) {
			defer wg.Done()

			for times := 0; times < 1000; times++ {
				lock.Lock()
				counter++
				//val := counter

				lock.Unlock()
				//fmt.Println("协程：", id, "Counter:", val)
			}
		}(i)
	}

	wg.Wait()
	fmt.Println(counter)
}

// 题目 ：使用原子操作（ sync/atomic 包）实现一个无锁的计数器。启动10个协程，每个协程对计数器进行1000次递增操作，最后输出计数器的值。
// 考察点 ：原子操作、并发数据安全。
func syncAtomicCounter() {
	//内存对齐，int32/int64
	var counter int64

	wg := &sync.WaitGroup{}
	wg.Add(10)

	for i := 0; i < 10; i++ {
		go func() {
			defer wg.Done()

			for times := 0; times < 1000; times++ {
				atomic.AddInt64(&counter, 1) //原子递增
			}
		}()
	}

	wg.Wait()
	fmt.Println(counter)
}

func main() {
	//syncCounter()
	syncAtomicCounter()
}
