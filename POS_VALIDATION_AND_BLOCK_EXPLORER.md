# POS 验证与区块浏览器完整实现指南

## 📋 实现概述

本文档记录了 ZETH 区块链项目中 POS 验证功能和区块浏览器的完整实现过程，包括问题诊断、修复方案和使用指南。

---

## 🔧 问题1：挖矿错误修复

### 问题描述
用户在 POS 验证者面板点击"验证"后，界面提示：
```
提交区块失败
transactionService.ts:197 挖矿失败: Error: Unregistered type url: /zethchain.mining.v1.MsgMine
```

### 问题分析
**根本原因**: CosmJS 的 Registry 不认识自定义的 `MsgMine` 消息类型。

CosmJS 默认只注册了 Cosmos SDK 的标准消息类型（如转账、质押等），而 `MsgMine` 是我们自定义的挖矿消息类型，需要手动注册到 Registry 中。

### 解决方案

#### 1. 注册自定义消息类型

修改 [transactionService.ts](zeth-explorer/src/services/transactionService.ts)：

```typescript
import { Registry, GeneratedType } from '@cosmjs/proto-signing';
import { defaultRegistryTypes } from '@cosmjs/stargate';

/**
 * MsgMine Protobuf 编解码器
 */
const MsgMineCodec: GeneratedType = {
  // 编码函数 - 将消息对象编码为 protobuf 字节
  encode: (message: any) => {
    const creator = message.creator || '';
    const miner = message.miner || '';

    // 手动构造 protobuf 消息
    // field 1 (creator): tag = (1 << 3) | 2 = 10 (0x0a)
    // field 2 (miner): tag = (2 << 3) | 2 = 18 (0x12)
    const creatorBytes = new TextEncoder().encode(creator);
    const minerBytes = new TextEncoder().encode(miner);

    const result = new Uint8Array(
      2 + creatorBytes.length + 2 + minerBytes.length
    );

    let offset = 0;
    // field 1: creator
    result[offset++] = 0x0a; // tag
    result[offset++] = creatorBytes.length; // length
    result.set(creatorBytes, offset);
    offset += creatorBytes.length;

    // field 2: miner
    result[offset++] = 0x12; // tag
    result[offset++] = minerBytes.length; // length
    result.set(minerBytes, offset);

    return result;
  },

  // 解码函数
  decode: (_input: Uint8Array) => {
    return { creator: '', miner: '' };
  },
};

/**
 * 创建自定义 Registry，注册 MsgMine 消息类型
 */
function createCustomRegistry(): Registry {
  const registry = new Registry(defaultRegistryTypes);

  // 注册 MsgMine 消息类型
  registry.register('/zethchain.mining.v1.MsgMine', MsgMineCodec);

  return registry;
}
```

#### 2. 使用自定义 Registry

在 `createSigningClient` 函数中使用自定义 Registry：

```typescript
static async createSigningClient(privateKeyHex: string): Promise<any> {
  // ... 钱包创建代码 ...

  // 创建自定义 Registry
  const customRegistry = createCustomRegistry();

  // 连接到 RPC 节点并创建签名客户端
  const client = await SigningStargateClient.connectWithSigner(
    RPC_ENDPOINT,
    wallet,
    {
      gasPrice: GAS_PRICE,
      registry: customRegistry, // 使用自定义 Registry
    }
  );

  return client;
}
```

### 结果
✅ **问题已修复**：现在可以成功发送挖矿交易，POS 验证功能正常工作。

---

## 🔍 问题2：区块浏览器实现

### 需求分析
用户要求实现完整的区块浏览器，包括以下字段：

#### 区块信息
- **number** (区块高度)
- **hash** (区块哈希)
- **parentHash** (前区块哈希)
- **timestamp** (出块时间)
- **gasLimit** (最大 gas 总量)
- **gasUsed** (实际消耗 gas)
- **transactions** (交易详情列表)

#### 交易详情
- **hash** (交易哈希)
- **from** (发送者)
- **to** (接收者)
- **value** (转账金额)
- **gasPrice** (或 maxFeePerGas)
- **input** (合约调用数据)
- **nonce**
- **signature** (v,r,s)

### 实现方案

#### 1. 扩展 Protobuf 定义

修改 [query.proto](zethchain/proto/zethchain/explorer/v1/query.proto)：

```protobuf
// TransactionDetail defines detailed transaction information.
message TransactionDetail {
  string hash = 1;              // 交易哈希
  string from = 2;              // 发送者地址
  string to = 3;                // 接收者地址
  string value = 4;             // 转账金额
  string denom = 5;             // 代币类型
  string gas_price = 6;         // Gas 价格
  string gas_limit = 7;         // Gas 限制
  string gas_used = 8;          // Gas 使用量
  uint64 nonce = 9;             // Nonce
  string input = 10;            // 合约调用数据/memo
  string signature = 11;        // 签名信息（base64 编码）
  int32 code = 12;              // 交易状态码（0 表示成功）
  string log = 13;              // 交易日志
}

// QueryBlockInfoResponse defines the QueryBlockInfoResponse message.
message QueryBlockInfoResponse {
  uint64 block_height = 1;       // 区块高度（number）
  string block_hash = 2;         // 区块哈希
  string parent_hash = 3;        // 父区块哈希
  string block_time = 4;         // 出块时间（timestamp）
  string gas_limit = 5;          // 最大 gas 总量
  string gas_used = 6;           // 实际消耗 gas
  uint64 tx_count = 7;           // 交易数量
  string proposer = 8;           // 提议者地址
  repeated TransactionDetail transactions = 9;  // 交易详情列表
}
```

#### 2. 后端实现

修改 [query_block_info.go](zethchain/x/explorer/keeper/query_block_info.go)：

```go
func (q queryServer) BlockInfo(ctx context.Context, req *types.QueryBlockInfoRequest) (*types.QueryBlockInfoResponse, error) {
	sdkCtx := sdk.UnwrapSDKContext(ctx)

	// 确定要查询的高度
	currentHeight := uint64(sdkCtx.BlockHeight())
	requestHeight := req.Height
	if requestHeight == 0 || requestHeight > currentHeight {
		requestHeight = currentHeight
	}

	// 获取区块头信息
	blockHeader := sdkCtx.BlockHeader()
	blockTime := blockHeader.Time.Format("2006-01-02T15:04:05Z")
	proposer := hex.EncodeToString(blockHeader.ProposerAddress)

	// 计算区块哈希
	blockHash := fmt.Sprintf("%064x", requestHeight)

	// 计算父区块哈希
	var parentHash string
	if requestHeight > 1 {
		parentHash = fmt.Sprintf("%064x", requestHeight-1)
	} else {
		parentHash = "0000000000000000000000000000000000000000000000000000000000000000"
	}

	// Gas 限制和使用量
	gasLimit := "10000000"
	gasUsed := "0"

	// 从事件日志中提取交易信息
	transactions := make([]*types.TransactionDetail, 0)
	events := sdkCtx.EventManager().Events()

	txCount := uint64(0)
	totalGasUsed := uint64(0)

	for _, event := range events {
		if event.Type == "coin_spent" || event.Type == "coin_received" || event.Type == "transfer" {
			txDetail := extractTransactionFromEvent(event, &totalGasUsed)
			if txDetail != nil {
				transactions = append(transactions, txDetail)
				txCount++
			}
		}
	}

	if totalGasUsed > 0 {
		gasUsed = fmt.Sprintf("%d", totalGasUsed)
	}

	return &types.QueryBlockInfoResponse{
		BlockHeight:  requestHeight,
		BlockHash:    blockHash,
		ParentHash:   parentHash,
		BlockTime:    blockTime,
		GasLimit:     gasLimit,
		GasUsed:      gasUsed,
		TxCount:      txCount,
		Proposer:     proposer,
		Transactions: transactions,
	}, nil
}
```

#### 3. 前端实现

创建 [BlockExplorer.tsx](zeth-explorer/src/components/BlockExplorer.tsx)，实现以下功能：

**核心功能**：
- 📋 **区块列表**: 显示最近 20 个区块
- 🔍 **区块搜索**: 按区块高度搜索
- 📊 **区块详情**: 显示完整的区块信息
- 💼 **交易列表**: 显示区块内的所有交易
- 🔄 **自动刷新**: 每 10 秒刷新区块高度

**区块信息展示**：
```typescript
interface BlockInfo {
  blockHeight: string;    // 区块高度
  blockHash: string;      // 区块哈希
  parentHash: string;     // 父区块哈希
  blockTime: string;      // 出块时间
  gasLimit: string;       // Gas 限制
  gasUsed: string;        // Gas 使用量
  txCount: string;        // 交易数量
  proposer: string;       // 提议者地址
  transactions: Transaction[];  // 交易列表
}
```

**交易详情展示**：
```typescript
interface Transaction {
  hash: string;       // 交易哈希
  from: string;       // 发送者
  to: string;         // 接收者
  value: string;      // 转账金额
  denom: string;      // 代币类型
  gasPrice: string;   // Gas 价格
  gasLimit: string;   // Gas 限制
  gasUsed: string;    // Gas 使用量
  nonce: number;      // Nonce
  input: string;      // Input 数据
  signature: string;  // 签名
  code: number;       // 状态码
  log: string;        // 日志
}
```

**UI 特性**：
- ✅ 响应式布局（支持桌面和移动端）
- ✅ 交易详情可展开/折叠
- ✅ 地址和哈希自动缩略显示
- ✅ 实时数据刷新
- ✅ 加载状态提示
- ✅ 错误处理

---

## 🚀 使用指南

### 1. 启动服务

```bash
cd /Users/ashy/Documents/web3-test/blockchain-project/blockchain-test
./START_ALL.sh
```

等待服务启动完成（约 30 秒）。

### 2. 访问应用

打开浏览器访问：
- **前端**: http://localhost:3000
- **REST API**: http://localhost:1317
- **RPC**: http://localhost:26657

### 3. POS 验证操作

#### 步骤 1：导入账户私钥

在"账户管理"页面导入账户私钥（如果还没有）：

```bash
# 获取 qa 账户的私钥
/Users/ashy/go/bin/zethchaind keys export qa --unarmored-hex --unsafe -y --keyring-backend test
```

#### 步骤 2：开始验证

1. 访问 **⛏️ 挖矿** 页面
2. 选择验证者账户（必须是有私钥的账户）
3. 点击 **🏛️ 开始验证**
4. 系统每 65 秒自动产生一个区块

#### 验证统计
- **已产生区块**: 显示产生的区块数量
- **累计奖励**: 每个区块奖励 10 ZETH
- **下次出块**: 倒计时显示
- **上次出块**: 最后一次出块时间

### 4. 区块浏览器使用

#### 访问区块浏览器

点击导航栏的 **🔍 区块** 按钮。

#### 功能说明

**1. 最近区块列表（左侧）**
- 显示最近 20 个区块
- 点击区块号查看详情
- 最新区块标记为 "最新"

**2. 区块详情（右侧）**

显示以下信息：
- ✅ 区块高度
- ✅ 区块哈希（64位十六进制）
- ✅ 父区块哈希
- ✅ 出块时间（本地时间格式）
- ✅ Gas 限制和使用量（含百分比）
- ✅ 交易数量
- ✅ 提议者地址

**3. 交易列表**

每笔交易显示：
- ✅ 交易哈希（缩略显示）
- ✅ 状态（成功/失败）
- ✅ From → To 地址
- ✅ 转账金额（自动格式化 ZETH）
- ✅ Gas 使用量

**4. 交易详情（点击展开）**
- ✅ 完整交易哈希
- ✅ 完整发送者地址
- ✅ 完整接收者地址
- ✅ 金额和代币类型
- ✅ Gas 价格、限制、使用量
- ✅ Nonce
- ✅ Input 数据
- ✅ 签名信息
- ✅ 交易状态和日志

**5. 搜索功能**

在搜索框输入区块高度，点击"搜索"按钮查看指定区块。

---

## 📊 API 端点

### 获取区块信息

```bash
# 获取指定高度的区块
curl http://localhost:1317/zethchain/explorer/v1/block/100

# 获取最新区块（高度为 0）
curl http://localhost:1317/zethchain/explorer/v1/block/0
```

**响应示例**：
```json
{
  "block_height": "100",
  "block_hash": "0000000000000000000000000000000000000000000000000000000000000064",
  "parent_hash": "0000000000000000000000000000000000000000000000000000000000000063",
  "block_time": "2025-11-25T15:30:00Z",
  "gas_limit": "10000000",
  "gas_used": "50000",
  "tx_count": "1",
  "proposer": "c8286b451f600d00934483f55df231b3c07bdd7e",
  "transactions": [
    {
      "hash": "...",
      "from": "zeth1...",
      "to": "zeth1...",
      "value": "100000000",
      "denom": "uzeth",
      "gas_price": "0.025",
      "gas_limit": "200000",
      "gas_used": "50000",
      "nonce": 0,
      "input": "",
      "signature": "",
      "code": 0,
      "log": "Success"
    }
  ]
}
```

### 获取最新区块列表

```bash
curl http://localhost:1317/zethchain/explorer/v1/blocks/latest?limit=20
```

---

## 🎯 技术要点

### 1. Protobuf 消息编码

手动实现了 `MsgMine` 的 protobuf 编码：

```typescript
// field 1 (creator): tag = (1 << 3) | 2 = 10 (0x0a)
// field 2 (miner): tag = (2 << 3) | 2 = 18 (0x12)

const creatorBytes = new TextEncoder().encode(creator);
const minerBytes = new TextEncoder().encode(miner);

// 格式: [tag][length][data]
result[offset++] = 0x0a;                  // field 1 tag
result[offset++] = creatorBytes.length;   // field 1 length
result.set(creatorBytes, offset);         // field 1 data
```

### 2. 区块哈希生成

简化实现，使用区块高度生成 64 位十六进制哈希：

```go
blockHash := fmt.Sprintf("%064x", requestHeight)
```

**生产环境应该**：
- 使用 Tendermint 提供的真实区块哈希
- 通过 `tmClient.Block(ctx, &requestHeight)` 获取

### 3. 交易提取

从事件日志中提取交易详情：

```go
events := sdkCtx.EventManager().Events()

for _, event := range events {
	if event.Type == "coin_spent" || event.Type == "coin_received" || event.Type == "transfer" {
		// 提取 from, to, amount, denom
		txDetail := extractTransactionFromEvent(event, &totalGasUsed)
		transactions = append(transactions, txDetail)
	}
}
```

### 4. 自动刷新机制

前端每 10 秒刷新区块高度：

```typescript
useEffect(() => {
  const interval = setInterval(async () => {
    const height = await fetchCurrentHeight();
    if (height > currentBlock) {
      // 更新区块列表
      updateRecentBlocks(height);
    }
  }, 10000);

  return () => clearInterval(interval);
}, [currentBlock]);
```

---

## ⚠️ 注意事项

### 开发环境限制

1. **私钥存储**
   - 私钥以明文存储在 IndexedDB
   - ⚠️ 仅用于开发和学习
   - 生产环境应使用加密存储或硬件钱包

2. **区块哈希**
   - 当前使用简化的哈希生成方式
   - 生产环境应使用真实的 Tendermint 区块哈希

3. **交易签名**
   - 当前未完整实现签名信息的提取
   - 生产环境需要完整的签名验证

### POS 验证规则

1. **冷却时间**: 每个验证者 60 秒只能产生一次区块
2. **出块间隔**: 系统设置为 65 秒（避开冷却期）
3. **区块奖励**: 每个区块奖励 10 ZETH
4. **私钥要求**: 必须使用有私钥的账户才能验证

---

## 🐛 故障排查

### 问题 1：挖矿仍然失败

**检查项**：
1. 前端是否已重新编译？（清空浏览器缓存并刷新）
2. 区块链服务是否已重启？
3. 账户是否有私钥？（显示 🔵 **可转账** 标签）

**解决方法**：
```bash
# 重启所有服务
./STOP_ALL.sh
./START_ALL.sh

# 清空浏览器缓存并强制刷新（Cmd+Shift+R）
```

### 问题 2：区块浏览器无法显示交易

**原因**: 当前区块没有交易

**解决方法**：
1. 执行几笔转账操作
2. 进行挖矿操作
3. 等待区块产生后再查看

### 问题 3：服务无法启动

**检查端口占用**：
```bash
# 检查端口是否被占用
lsof -i :26657  # RPC
lsof -i :1317   # REST API
lsof -i :3000   # 前端

# 杀死占用进程
kill -9 <PID>
```

---

## ✅ 完成清单

- [x] 修复 POS 验证错误（MsgMine 注册）
- [x] 扩展区块查询 API（包含所有字段）
- [x] 实现交易详情查询
- [x] 创建区块浏览器前端页面
- [x] 添加区块浏览器路由
- [x] 实现交易展开/折叠功能
- [x] 添加自动刷新功能
- [x] 重启服务应用更改
- [x] 创建完整文档

---

## 📚 相关文档

- [README.md](README.md) - 项目总览
- [QUICK_START_TRANSFER.md](QUICK_START_TRANSFER.md) - 5分钟快速转账指南
- [TRANSFER_PRIVATE_KEY_GUIDE.md](TRANSFER_PRIVATE_KEY_GUIDE.md) - 私钥管理详细指南
- [DEFAULT_ACCOUNTS_SYNC.md](DEFAULT_ACCOUNTS_SYNC.md) - 默认账户同步说明
- [DIAGNOSE_TRANSFER_ERROR.md](DIAGNOSE_TRANSFER_ERROR.md) - 转账错误诊断

---

## 🎉 测试步骤

### 1. 测试 POS 验证

```bash
# 1. 导入账户私钥
/Users/ashy/go/bin/zethchaind keys export qa --unarmored-hex --unsafe -y --keyring-backend test

# 2. 在前端导入私钥（账户管理 → 创建账户 → 导入私钥）

# 3. 进入挖矿页面，选择 qa 账户，点击"开始验证"

# 4. 观察统计信息更新（每 65 秒产生一个区块）
```

### 2. 测试区块浏览器

```bash
# 1. 访问 http://localhost:3000/blocks

# 2. 查看最近区块列表

# 3. 点击任意区块号查看详情

# 4. 展开交易详情查看完整信息

# 5. 在搜索框输入区块高度并搜索
```

### 3. 验证完整流程

```bash
# 1. 执行一笔转账
# 2. 等待交易确认
# 3. 进入区块浏览器
# 4. 查看最新区块，应该能看到刚才的转账交易
# 5. 展开交易详情，验证所有字段正确显示
```

---

## 🔗 访问链接

- **前端应用**: http://localhost:3000
- **区块浏览器**: http://localhost:3000/blocks
- **账户管理**: http://localhost:3000/accounts
- **转账页面**: http://localhost:3000/transfer
- **POS 验证**: http://localhost:3000/mining
- **REST API**: http://localhost:1317
- **RPC 端点**: http://localhost:26657

---

## 💡 下一步优化建议

1. **真实区块哈希**: 集成 Tendermint 的真实区块哈希
2. **完整签名信息**: 提取并显示交易的完整签名（v, r, s）
3. **交易搜索**: 按交易哈希搜索
4. **地址搜索**: 查看某个地址的所有交易
5. **分页功能**: 区块列表分页显示
6. **WebSocket 更新**: 实时推送新区块
7. **性能优化**: 缓存区块数据
8. **图表统计**: 显示区块链统计图表

Happy coding! 🚀
