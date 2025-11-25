#!/bin/bash

# 获取账户信息脚本

echo "=========================================="
echo "  📝 ZETH 区块链账户信息"
echo "=========================================="
echo ""

cd "$(dirname "$0")/zethchain"

echo "请将以下信息复制到前端钱包管理页面进行导入："
echo ""

for account in qa qb qc; do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "账户名称: $account"
    
    # 获取地址
    ADDRESS=$(/Users/ashy/go/bin/zethchaind keys show $account --keyring-backend test --address 2>/dev/null)
    echo "地址: $ADDRESS"
    
    # 获取余额
    BALANCE=$(curl -s "http://localhost:1317/cosmos/bank/v1beta1/balances/$ADDRESS" | jq -r '.balances[] | select(.denom == "uzeth") | (.amount|tonumber / 1000000 | tostring) + " ZETH"' 2>/dev/null)
    echo "余额: ${BALANCE:-查询中...}"
    
    # 获取私钥
    echo "私钥:"
    /Users/ashy/go/bin/zethchaind keys export $account --unarmored-hex --unsafe -y --keyring-backend test 2>&1 | tail -1
    
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "导入步骤："
echo "1. 访问 http://localhost:3000"
echo "2. 进入「钱包管理」页面"
echo "3. 清除旧账户（浏览器 F12 > Application > IndexedDB > ZETHWallet > accounts > Clear）"
echo "4. 点击「导入账户」"
echo "5. 输入上面的私钥和账户名称"
echo ""
