package main

import (
	"context"
	"fmt"
	"log"
	"math/big"
	"os"
	"strings"

	"github.com/joho/godotenv"

	"work2/counter"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
)

// 自动去掉私钥的 0x / 0X 前缀
func normalizePrivateKey(pk string) string {
	pk = strings.TrimPrefix(pk, "0x")
	pk = strings.TrimPrefix(pk, "0X")
	return pk
}

func main() {

	// ---------- Step 0. 加载 .env ----------
	err := godotenv.Load()
	if err != nil {
		log.Fatal("无法加载 .env 文件")
	}

	// ----------  获取 RPC ----------
	rpcURL := os.Getenv("SEPOLIA_RPC")
	if rpcURL == "" {
		log.Fatal("缺少 SEPOLIA_RPC")
	}

	client, err := ethclient.Dial(rpcURL)
	if err != nil {
		log.Fatal("RPC 连接失败:", err)
	}
	fmt.Println("已连接到 Sepolia")

	// ----------  获取合约地址 ----------
	contractAddr := os.Getenv("CONTRACT_ADDRESS")
	if contractAddr == "" {
		log.Fatal("缺少 CONTRACT_ADDRESS")
	}

	address := common.HexToAddress(contractAddr)

	counterContract, err := counter.NewCounter(address, client)
	if err != nil {
		log.Fatal("加载 Counter 合约失败:", err)
	}
	fmt.Println("已加载合约:", address.Hex())

	// ----------   调用 view 函数：get() ----------
	value, err := counterContract.Get(nil)
	if err != nil {
		log.Fatal("调用 get() 失败:", err)
	}
	fmt.Println("当前计数器数值:", value)

	// ----------  读取 PRIVATE_KEY ----------
	rawKey := os.Getenv("PRIVATE_KEY")
	if rawKey == "" {
		log.Fatal("缺少 PRIVATE_KEY")
	}

	privHex := normalizePrivateKey(rawKey)

	privateKey, err := crypto.HexToECDSA(privHex)
	if err != nil {
		log.Fatal("私钥解析失败:", err)
	}

	// ----------   构造交易签名器 ----------
	chainID := big.NewInt(11155111) // Sepolia
	auth, err := bind.NewKeyedTransactorWithChainID(privateKey, chainID)
	if err != nil {
		log.Fatal("创建签名器失败:", err)
	}
	auth.Context = context.Background()

	// ----------  调用 increment() ----------
	tx, err := counterContract.Increment(auth)
	if err != nil {
		log.Fatal("increment() 调用失败:", err)
	}

	fmt.Println("increment() 已发送，交易哈希:", tx.Hash().Hex())

	// ----------  等待区块确认后再次读取 ----------
	// 这里不能用sleep。链上确定交易时间不确定
	receipt, err := bind.WaitMined(context.Background(), client, tx)
	if err != nil {
		log.Fatal("等待交易确认失败:", err)
	}

	if receipt.Status == 1 {
		fmt.Println("交易成功！Block =", receipt.BlockNumber)
	} else {
		fmt.Println("交易失败！")
	}
	// ---------- 再次读取值 ----------
	newValue, err := counterContract.Get(nil)
	if err != nil {
		log.Fatal("调用 get() 失败:", err)
	}

	fmt.Println("最新计数器数值:", newValue)
	// ---------- 查询历史事件 ----------
	filterRecentEvents(client, address)

}
func filterRecentEvents(client *ethclient.Client, contractAddress common.Address) {
	fmt.Println("查询最近 10 个区块中的 CounterChanged 事件...")

	ctx := context.Background()

	// 1. 获取最新区块
	header, err := client.HeaderByNumber(ctx, nil)
	if err != nil {
		log.Fatal("无法获取最新区块:", err)
	}

	latest := header.Number.Uint64()
	var start uint64 = 0
	if latest > 9 {
		start = latest - 9
	}

	filterer, err := counter.NewCounterFilterer(contractAddress, client)
	if err != nil {
		log.Fatal("创建 Filterer 失败:", err)
	}

	opts := &bind.FilterOpts{
		Start:   start,
		End:     &latest,
		Context: ctx,
	}

	it, err := filterer.FilterCounterChanged(opts)
	if err != nil {
		log.Fatal("FilterCounterChanged 调用失败:", err)
	}

	// 遍历事件
	for it.Next() {
		evt := it.Event
		fmt.Printf("事件 old=%v new=%v block=%v tx=%s\n",
			evt.OldValue,
			evt.NewValue,
			evt.Raw.BlockNumber,
			evt.Raw.TxHash.Hex(),
		)
	}

	fmt.Println("事件查询完毕")
}
