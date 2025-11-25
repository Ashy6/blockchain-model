#!/bin/bash

# ================================================
# ZETH 区块链项目 - 一键启动脚本
# ================================================
# 功能：
# 1. 启动真实区块链 (ignite chain serve)
# 2. 启动前端应用
# 3. 显示账户信息和访问地址
# ================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "================================================"
echo "  🚀 ZETH 区块链项目启动"
echo "================================================"
echo ""

# ==================== 清理旧进程 ====================
echo "${YELLOW}1. 清理旧进程...${NC}"
pkill -9 node 2>/dev/null || true
pkill -9 ignite 2>/dev/null || true
pkill -9 zethchaind 2>/dev/null || true
lsof -ti:26657 | xargs kill -9 2>/dev/null || true
lsof -ti:1317 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:4500 | xargs kill -9 2>/dev/null || true
sleep 2
echo -e "   ${GREEN}✓${NC} 清理完成"
echo ""

# ==================== 启动区块链 ====================
echo "${YELLOW}2. 启动区块链服务...${NC}"
cd "$(dirname "$0")/zethchain"
nohup ignite chain serve > ../blockchain.log 2>&1 &
BLOCKCHAIN_PID=$!
echo -e "   ${GREEN}✓${NC} 区块链已启动 (PID: $BLOCKCHAIN_PID)"
echo ""

# ==================== 等待区块链初始化 ====================
echo "${YELLOW}3. 等待区块链初始化...${NC}"
echo -n "   "
for i in {1..30}; do
    echo -n "."
    sleep 1
    # 检查区块链是否启动成功
    if curl -s http://localhost:26657/status > /dev/null 2>&1; then
        echo ""
        echo -e "   ${GREEN}✓${NC} 区块链初始化完成"
        break
    fi
done
echo ""

# ==================== 启动前端 ====================
echo "${YELLOW}4. 启动前端应用...${NC}"
cd ../zeth-explorer

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "   正在安装依赖..."
    npm install > /dev/null 2>&1
fi

nohup npm start > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "   ${GREEN}✓${NC} 前端已启动 (PID: $FRONTEND_PID)"
echo ""

# ==================== 显示账户信息 ====================
echo "${YELLOW}5. 账户信息...${NC}"
cd ../zethchain
sleep 3

echo ""
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${GREEN}测试账户（初始配置：总供应 21000 ZETH）${NC}"
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 获取账户信息
/Users/ashy/go/bin/zethchaind keys list --keyring-backend test 2>/dev/null | grep -E "name:|address:" | paste - - | while read line; do
    NAME=$(echo "$line" | grep -oP 'name:\s*\K\w+')
    ADDR=$(echo "$line" | grep -oP 'address:\s*\K\S+')
    echo "${YELLOW}账户${NC}: $NAME"
    echo "  地址: ${GREEN}$ADDR${NC}"
    echo "  余额: 7000 ZETH (7000000000 uzeth)"

    # 导出私钥
    PRIVATE_KEY=$(/Users/ashy/go/bin/zethchaind keys export $NAME --unarmored-hex --unsafe -y --keyring-backend test 2>&1 | tail -1)
    echo "  私钥: ${RED}$PRIVATE_KEY${NC}"
    echo ""
done

cd ..

echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ==================== 服务地址 ====================
echo "${GREEN}================================================${NC}"
echo "${GREEN}  ✓ 启动完成！${NC}"
echo "${GREEN}================================================${NC}"
echo ""
echo "${BLUE}📡 服务地址:${NC}"
echo "  • 前端界面:      ${GREEN}http://localhost:3000${NC}"
echo "  • 区块链 RPC:    ${GREEN}http://localhost:26657${NC}"
echo "  • 区块链 REST:   ${GREEN}http://localhost:1317${NC}"
echo "  • Faucet:        ${GREEN}http://localhost:4500${NC}"
echo ""
echo "${BLUE}📊 API 端点:${NC}"
echo "  • 链统计:        ${GREEN}http://localhost:1317/zethchain/explorer/v1/chain_stats${NC}"
echo "  • 区块信息:      ${GREEN}http://localhost:1317/zethchain/explorer/v1/block/{height}${NC}"
echo "  • 最新区块:      ${GREEN}http://localhost:1317/zethchain/explorer/v1/blocks/latest${NC}"
echo ""
echo "${BLUE}📝 日志文件:${NC}"
echo "  • 区块链:        blockchain.log"
echo "  • 前端:          frontend.log"
echo ""
echo "${BLUE}🛑 停止服务:${NC}"
echo "  运行: ${YELLOW}./STOP_ALL.sh${NC}"
echo ""
echo "${GREEN}================================================${NC}"
echo ""

# ==================== 等待前端启动 ====================
echo "${YELLOW}等待前端启动（约 30 秒）...${NC}"
echo -n "   "
for i in {1..30}; do
    echo -n "."
    sleep 1
done
echo ""
echo ""

echo "${GREEN}🎉 所有服务已就绪！${NC}"
echo ""
echo "${BLUE}下一步操作：${NC}"
echo "  1. 访问 ${GREEN}http://localhost:3000${NC}"
echo "  2. 进入「钱包管理」导入上面显示的私钥"
echo "  3. 开始使用 ZETH 区块链！"
echo ""
