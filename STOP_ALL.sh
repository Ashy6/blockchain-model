#!/bin/bash

# ================================================
# ZETH 区块链项目 - 停止脚本
# ================================================

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "================================================"
echo "  🛑 停止 ZETH 区块链服务"
echo "================================================"
echo ""

echo "${YELLOW}停止所有服务...${NC}"

# 停止 Node.js (前端)
pkill -9 node 2>/dev/null && echo -e "  ${GREEN}✓${NC} 前端已停止" || echo "  • 前端未运行"

# 停止 Ignite
pkill -9 ignite 2>/dev/null && echo -e "  ${GREEN}✓${NC} Ignite 已停止" || echo "  • Ignite 未运行"

# 停止 zethchaind
pkill -9 zethchaind 2>/dev/null && echo -e "  ${GREEN}✓${NC} 区块链已停止" || echo "  • 区块链未运行"

# 清理端口
lsof -ti:26657 | xargs kill -9 2>/dev/null
lsof -ti:1317 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:4500 | xargs kill -9 2>/dev/null

echo ""
echo -e "${GREEN}✓ 所有服务已停止${NC}"
echo ""
