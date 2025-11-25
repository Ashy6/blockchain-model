# ZETH 区块链项目

基于 Cosmos SDK 构建的完整区块链解决方案，包含真实区块链和前端浏览器。

## 📦 项目结构

```
blockchain-test/
├── zethchain/              # 区块链后端 (Cosmos SDK)
│   ├── x/mining/          # 挖矿模块
│   ├── x/explorer/        # 区块浏览器模块
│   ├── proto/             # Protocol Buffers 定义
│   └── config.yml         # 区块链配置
├── zeth-explorer/         # 前端应用 (React + TypeScript)
│   ├── src/
│   │   ├── components/    # React 组件
│   │   ├── services/      # API 服务
│   │   └── types/         # TypeScript 类型定义
│   └── .env              # 环境变量配置
├── START_ALL.sh          # 一键启动脚本
└── STOP_ALL.sh           # 停止服务脚本
```

## 🚀 快速开始

### 一键启动

```bash
./START_ALL.sh
```

该脚本将：

1. 清理旧进程
2. 启动区块链服务
3. 启动前端应用
4. 显示账户信息和私钥

### 访问前端

启动完成后，访问：**<http://localhost:3000>**

## 💰 代币经济

### 总供应量

- **21,000 ZETH** (21,000,000,000 uzeth)
- 1 ZETH = 1,000,000 uzeth

### 初始账户

| 账户 | 余额       | 说明       |
| ---- | ---------- | ---------- |
| qa   | 7,000 ZETH | 验证者账户 |
| qb   | 7,000 ZETH | 普通账户   |
| qc   | 7,000 ZETH | 普通账户   |

### 挖矿奖励

- 每个区块奖励：**100 ZETH**
- 出块间隔：约 6 秒
- 验证方式：PoS (Proof of Stake)

## 🌐 服务端口

| 服务     | 端口  | 说明            |
| -------- | ----- | --------------- |
| 前端     | 3000  | React 应用      |
| RPC      | 26657 | Tendermint RPC  |
| REST API | 1317  | Cosmos SDK REST |
| Faucet   | 4500  | 代币水龙头      |

## 📡 API 端点

### 区块链统计

```
GET http://localhost:1317/zethchain/explorer/v1/chain_stats
```

### 区块信息

```
GET http://localhost:1317/zethchain/explorer/v1/block/{height}
```

### 最新区块列表

```
GET http://localhost:1317/zethchain/explorer/v1/blocks/latest
```

### 账户余额

```
GET http://localhost:1317/cosmos/bank/v1beta1/balances/{address}
```

## 🎯 主要功能

### 后端功能

- ✅ 自定义 Mining 模块（挖矿奖励）
- ✅ 自定义 Explorer 模块（区块浏览）
- ✅ 代币转账功能
- ✅ Gas 费用机制
- ✅ PoS 验证者系统
- ✅ REST API 接口

### 前端功能

- ✅ 钱包管理（创建、导入、导出）
- ✅ 账户余额查询
- ✅ 代币转账
- ✅ PoS 挖矿界面
- ✅ 挖矿历史查询
- ✅ 交易记录浏览
- ✅ 区块浏览器
- ✅ 链统计信息显示

## 📖 使用指南

### 1. 查看默认账户（自动同步）

**前端会自动显示三个默认账户！**

1. 启动后，打开前端 <http://localhost:3000>
2. 进入「账户管理」页面
3. 三个默认账户（qa、qb、qc）会自动出现
4. 余额会自动从区块链加载
5. **无需手动导入！**

**工作原理**：前端会自动从区块链 API (`/zethchain/explorer/v1/default_accounts`) 获取默认账户列表并同步到本地。

### 2. 导入私钥（如需转账）

如果要进行转账操作，需要导入账户私钥：

1. 启动后，脚本会显示三个账户的私钥
2. 或使用命令导出私钥：

   ```bash
   /Users/ashy/go/bin/zethchaind keys export qa --unarmored-hex --unsafe -y --keyring-backend test
   ```

3. 打开前端 <http://localhost:3000>
4. 进入「账户管理」→「创建账户」
5. 使用「导入账户」功能，输入私钥

### 3. 转账

1. 选择发送账户（需要已导入私钥）
2. 输入接收地址
3. 输入转账金额
4. 确认并发送

### 4. 挖矿

1. 进入「PoS 验证者」页面
2. 选择验证者账户（qa）
3. 点击「开始验证」
4. 每 65 秒自动产生一个区块
5. 每个区块获得 100 ZETH 奖励

## 🛠️ 故障排查

### 区块链无法启动

```bash
rm -rf ~/.zethchain
./START_ALL.sh
```

### 查看日志

```bash
tail -f blockchain.log
tail -f frontend.log
```

## 📝 配置文件

### 区块链配置

文件：`zethchain/config.yml`

```yaml
accounts:
  - name: qa
    coins:
      - 7000000000uzeth
  - name: qb
    coins:
      - 7000000000uzeth
  - name: qc
    coins:
      - 7000000000uzeth
```

## 🔐 安全说明

⚠️ **本项目仅用于学习和演示目的，不要在生产环境中使用！**

## 📚 技术栈

- **Cosmos SDK v0.53.3** - 区块链框架
- **React 18** - 前端框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式框架
- **CosmJS** - Cosmos 客户端库

---

**Built with ❤️ using Cosmos SDK**

📊 技术细节
交易哈希计算流程
// 1. Base64 解码
const binaryString = atob(txBase64);
const txBytes = new Uint8Array(binaryString.length);
for (let i = 0; i < binaryString.length; i++) {
  txBytes[i] = binaryString.charCodeAt(i);
}

// 2. SHA256 哈希
const hashBuffer = await crypto.subtle.digest('SHA-256', txBytes);

// 3. 转换为大写 Hex
const txHash = Array.from(new Uint8Array(hashBuffer))
  .map(b => b.toString(16).padStart(2, '0'))
  .join('')
  .toUpperCase();
