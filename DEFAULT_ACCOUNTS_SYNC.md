# 默认账户自动同步功能

## 问题背景

之前的实现中，前端 (`AccountManager.tsx`) 有一个 `initializeDefaultAccounts` 函数会自动创建 qa、qb、qc 三个默认账户。这导致了以下问题：

1. **地址不匹配**：前端创建的账户地址与区块链上的实际地址不一致
2. **余额显示错误**：查询余额时使用错误的地址，导致显示 0.000000 ZETH
3. **架构混乱**：账户管理应该由后端（区块链）负责，前端只应该查看和导入

## 解决方案

### 1. 新增后端 API 端点

创建了 `/zethchain/explorer/v1/default_accounts` API 端点，返回区块链上的三个默认账户：

```json
{
  "accounts": [
    {"name": "qa", "address": "zeth1gj9qdvxt2y0fgczzrtj7le0ttrwg9hsvrvm6nx"},
    {"name": "qb", "address": "zeth1fl48vsnmsdzcv85q5d2q4z5ajdha8yu3z8vmax"},
    {"name": "qc", "address": "zeth1dktv9m57ac8cm5umx594rgdh7vf4lqp28ljk94"}
  ]
}
```

**实现文件**：
- [proto/zethchain/explorer/v1/query.proto](zethchain/proto/zethchain/explorer/v1/query.proto) - 定义 gRPC 接口
- [x/explorer/keeper/query_default_accounts.go](zethchain/x/explorer/keeper/query_default_accounts.go:14-65) - 实现查询逻辑
- [x/explorer/types/expected_keepers.go](zethchain/x/explorer/types/expected_keepers.go:14-24) - 定义依赖接口
- [x/explorer/keeper/keeper.go](zethchain/x/explorer/keeper/keeper.go:22-35) - 添加 keeper 依赖
- [x/explorer/module/depinject.go](zethchain/x/explorer/module/depinject.go:53-60) - 依赖注入配置

### 2. 前端自动同步

前端在初始化时会：
1. 调用 `/default_accounts` API 获取区块链账户列表
2. 检查这些账户是否已存在于本地 IndexedDB
3. 如果不存在，自动添加到本地数据库（仅包含地址，不包含私钥）
4. 这样用户就能立即看到三个默认账户及其余额

**实现文件**：
- [src/services/api.ts](zeth-explorer/src/services/api.ts:208-216) - 添加 `getDefaultAccounts()` API 函数
- [src/components/AccountManager.tsx](zeth-explorer/src/components/AccountManager.tsx:29-57) - 自动同步逻辑

### 3. 架构改进

**新架构**：
```
区块链 (后端)
    ↓ 提供账户信息
前端 API 调用
    ↓ 自动同步
IndexedDB (本地存储)
    ↓ 显示
用户界面
```

**关键特性**：
- ✅ 前端不再创建默认账户
- ✅ 所有账户信息来源于区块链
- ✅ 地址始终与链上保持一致
- ✅ 余额查询使用正确的地址
- ✅ 支持多次重启区块链（地址可能变化）

## 当前账户状态

根据最新查询，三个默认账户及其余额：

| 账户 | 地址 | 余额 |
|------|------|------|
| qa | zeth1gj9qdvxt2y0fgczzrtj7le0ttrwg9hsvrvm6nx | 6,900 ZETH |
| qb | zeth1fl48vsnmsdzcv85q5d2q4z5ajdha8yu3z8vmax | 100 ZETH |
| qc | zeth1dktv9m57ac8cm5umx594rgdh7vf4lqp28ljk94 | 7,000 ZETH |

**注意**：qa 账户是验证者，有 100 ZETH 被质押，因此可用余额是 6,900 ZETH。

## 使用方法

### 启动项目

```bash
./START_ALL.sh
```

### 访问前端

打开浏览器访问 http://localhost:3000

### 查看默认账户

1. 前端会自动显示三个默认账户（qa、qb、qc）
2. 余额会自动从区块链加载
3. 无需手动导入或创建

### 导出私钥（如需转账）

如果需要使用某个账户进行转账，需要导出私钥：

```bash
# 导出 qa 账户私钥
/Users/ashy/go/bin/zethchaind keys export qa --unarmored-hex --unsafe -y --keyring-backend test

# 导出 qb 账户私钥
/Users/ashy/go/bin/zethchaind keys export qb --unarmored-hex --unsafe -y --keyring-backend test

# 导出 qc 账户私钥
/Users/ashy/go/bin/zethchaind keys export qc --unarmored-hex --unsafe -y --keyring-backend test
```

然后在前端「账户管理」页面，使用「导入账户」功能，输入私钥即可进行转账操作。

## API 测试

### 查询默认账户列表

```bash
curl http://localhost:1317/zethchain/explorer/v1/default_accounts
```

### 查询账户余额

```bash
# 查询 qa 余额
curl http://localhost:1317/cosmos/bank/v1beta1/balances/zeth1gj9qdvxt2y0fgczzrtj7le0ttrwg9hsvrvm6nx

# 查询 qb 余额
curl http://localhost:1317/cosmos/bank/v1beta1/balances/zeth1fl48vsnmsdzcv85q5d2q4z5ajdha8yu3z8vmax

# 查询 qc 余额
curl http://localhost:1317/cosmos/bank/v1beta1/balances/zeth1dktv9m57ac8cm5umx594rgdh7vf4lqp28ljk94
```

## 技术细节

### 后端实现

`query_default_accounts.go` 实现逻辑：
1. 遍历所有链上账户（使用 `authKeeper.IterateAccounts`）
2. 检查账户是否有余额（使用 `bankKeeper.GetAllBalances`）
3. 返回前三个有余额的账户
4. 为账户分配名称 qa、qb、qc

### 前端实现

`AccountManager.tsx` 初始化逻辑：
1. 调用 `getDefaultAccounts()` API
2. 遍历返回的账户列表
3. 使用 `AccountDB.getAccountByAddress()` 检查是否已存在
4. 如不存在，调用 `AccountDB.addAccount()` 添加账户
5. 账户的 `privateKey` 字段为空字符串（仅查看模式）
6. 账户的 `onChain` 字段设置为 `true`

## 后续优化建议

1. **私钥管理**：可以在前端添加「导入私钥」按钮，方便用户快速导入默认账户的私钥
2. **账户更新**：当区块链重启且地址变化时，前端可以自动更新账户地址
3. **只读标识**：在 UI 上标识哪些账户是只读的（没有私钥）
4. **批量导入**：提供批量导入三个默认账户私钥的功能

## 相关文档

- [README.md](README.md) - 项目总览
- [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) - 项目实现详情
- [FIX_BALANCE_ISSUE.md](FIX_BALANCE_ISSUE.md) - 余额问题排查指南（已过时）
