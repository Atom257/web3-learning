package main

import (
	"context"
	"crypto/ecdsa"
	"flag"
	"fmt"
	"log"
	"math"
	"math/big"
	"os"
	"strings"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
)

type SendEthConfig struct {
	To    string
	Value float64
}

func handleSendEthCmd() {

	sendCmd := flag.NewFlagSet("sendeth", flag.ExitOnError)

	cfg := SendEthConfig{}
	sendCmd.StringVar(&cfg.To, "to", "", "接收方地址")
	sendCmd.Float64Var(&cfg.Value, "value", 0, "发送金额 (ETH)")

	sendCmd.Parse(os.Args[2:])

	if cfg.To == "" || cfg.Value <= 0 {
		log.Fatal("参数错误: 必须提供 -to 和 -value")
	}

	rpcURL := os.Getenv("INFURA_URL")
	pkString := os.Getenv("PRIVATE_KEY")
	if rpcURL == "" || pkString == "" {
		log.Fatal("请在 .env 设置 INFURA_URL 和 PRIVATE_KEY")
	}

	client, err := ethclient.Dial(rpcURL)
	if err != nil {
		log.Fatal("连接节点失败:", err)
	}
	privHex := strings.TrimPrefix(pkString, "0x")
	privateKey, err := crypto.HexToECDSA(privHex)
	if err != nil {
		log.Fatalf("解析私钥失败: %v", err)
	}
	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		log.Fatal("公钥类型断言失败")
	}

	fromAddr := crypto.PubkeyToAddress(*publicKeyECDSA)

	nonce, err := client.PendingNonceAt(context.Background(), fromAddr)
	if err != nil {
		log.Fatal("获取 nonce 失败:", err)
	}

	value := big.NewInt(int64(cfg.Value * math.Pow10(18)))

	gasLimit := uint64(21000)
	gasPrice, err := client.SuggestGasPrice(context.Background())
	if err != nil {
		log.Fatal("无法获取 gas price:", err)
	}

	toAddr := common.HexToAddress(cfg.To)

	tx := types.NewTransaction(nonce, toAddr, value, gasLimit, gasPrice, nil)

	chainID, err := client.NetworkID(context.Background())
	if err != nil {
		log.Fatal("获取 chainID 失败:", err)
	}

	signedTx, err := types.SignTx(tx, types.NewEIP155Signer(chainID), privateKey)
	if err != nil {
		log.Fatal("交易签名失败:", err)
	}

	err = client.SendTransaction(context.Background(), signedTx)
	if err != nil {
		log.Fatal("交易发送失败:", err)
	}

	fmt.Println("========== ETH Send ==========")
	fmt.Println("From:", fromAddr.Hex())
	fmt.Println("To:", toAddr.Hex())
	fmt.Println("Amount(ETH):", value)
	fmt.Println("GasPrice(wei):", gasPrice)
	fmt.Println("Nonce:", nonce)
	fmt.Println("TxHash:", signedTx.Hash().Hex())
}
