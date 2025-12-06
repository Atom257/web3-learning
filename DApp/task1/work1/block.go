package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"math/big"
	"os"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/ethereum/go-ethereum/rpc"
)

type CmdConfig struct {
	Num int64
}

func handleBlockCmd() {

	blockCmd := flag.NewFlagSet("block", flag.ExitOnError)

	cfg := CmdConfig{}
	blockCmd.Int64Var(&cfg.Num, "num", 0, "区块号")

	// 解析 block 子命令的参数
	blockCmd.Parse(os.Args[2:])

	fmt.Println("查询区块号:", cfg.Num)
	if cfg.Num <= 0 {
		log.Println("请输入正确区块号: -num 12345")
		return
	}
	rpcURL := os.Getenv("INFURA_URL")
	if rpcURL == "" {
		log.Fatal("请在 .env 中配置 INFURA_URL")
	}

	client, err := ethclient.Dial(rpcURL)
	if err != nil {
		log.Fatal("连接节点失败:", err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	block, err := client.BlockByNumber(ctx, big.NewInt(cfg.Num))
	if err != nil {
		log.Fatal("查询区块失败:", err)
	}

	fmt.Println("===== 区块信息 =====")
	fmt.Println("区块号:", block.Number().Uint64())
	fmt.Println("哈希:", block.Hash().Hex())
	fmt.Println("Parent哈希:", block.ParentHash().Hex())
	fmt.Println("时间戳:", block.Time())

	transCount := len(block.Transactions())
	fmt.Println("交易数量:", transCount)
	fmt.Println("Gas Used :", block.GasUsed())
	fmt.Println("Gas Limit :", block.GasLimit())
	fmt.Println("Base Fee Per Gas:", block.BaseFee())
	fmt.Println("Extra:", block.Extra())
	fmt.Println("====================")
	fmt.Println("===== 区块交易信息 =====")
	receipts, err := client.BlockReceipts(ctx, rpc.BlockNumberOrHashWithHash(block.Hash(), false))

	if err != nil {
		log.Fatalf("获取收据失败: %v", err)
	}
	limit := 3

	if len(receipts) < limit {
		limit = len(receipts)
	}
	for i := 0; i < limit; i++ {
		receipt := receipts[i]
		fmt.Printf("\n------ Receipt %d ------\n", i)
		printReceiptInfo(receipt)
		printLogs(receipt.Logs)
	}
	fmt.Println("====================")
}
func printReceiptInfo(r *types.Receipt) {
	fmt.Println("TxHash:", r.TxHash.Hex())
	fmt.Println("Status:", r.Status)
	fmt.Println("GasUsed:", r.GasUsed)
	fmt.Println("ContractAddress:", r.ContractAddress.Hex())
	fmt.Println("LogsCount:", len(r.Logs))
}

func printLogs(logs []*types.Log) {
	limit := 3

	if len(logs) < limit {
		limit = len(logs)
	}
	for i := 0; i < limit; i++ {
		log := logs[i]
		fmt.Println("  Log Address:", log.Address.Hex())
		fmt.Println("  Topics:")
		for i, t := range log.Topics {
			fmt.Printf("    [%d] %s\n", i, t.Hex())
		}
		fmt.Println("  Data:", common.Bytes2Hex(log.Data))
	}

}
