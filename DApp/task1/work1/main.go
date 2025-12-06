package main

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

/*
支持命令：

查询区块（支持 ETH 与 ERC20 转账识别）
    go run main.go block -num 12345

发送 ETH
    go run main.go sendeth -to 0xReceiver -value 0.01

发送 ERC20
    go run main.go senderc20 -to 0xReceiver -token 0xTokenAddress -value 10
*/

func printHelp() {
	fmt.Println("===== DApp CLI 使用说明 =====")

	fmt.Println("block        查询区块信息（支持 ETH 及 ERC20 解析）")
	fmt.Println("示例：go run . block -num 9779585")

	fmt.Println()

	fmt.Println("sendeth      发送 ETH")
	fmt.Println("示例：go run . sendeth -to 0xReceiver -value 0.01")

	fmt.Println("==============================")
}

func main() {

	if len(os.Args) < 2 {
		printHelp()
		return
	}
	godotenv.Load()
	cmd := os.Args[1]

	switch cmd {

	case "block":
		handleBlockCmd()

	case "sendeth":
		handleSendEthCmd()

	default:
		fmt.Println("未知命令:", cmd)
		printHelp()
	}
}
