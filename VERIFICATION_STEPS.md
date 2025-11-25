# 功能验证步骤

## 默认账户自动同步功能测试

### 前提条件

确保所有服务正在运行：
```bash
# 检查服务状态
lsof -ti:26657,1317,3000 | wc -l
# 应该返回 3 (三个端口都在监听)
```

### 测试步骤

#### 1. 验证后端 API

测试默认账户 API 端点：

```bash
curl http://localhost:1317/zethchain/explorer/v1/default_accounts
```

**预期结果**：
```json
{
  "accounts": [
    {"name":"qa","address":"zeth1gj9qdvxt2y0fgczzrtj7le0ttrwg9hsvrvm6nx"},
    {"name":"qb","address":"zeth1fl48vsnmsdzcv85q5d2q4z5ajdha8yu3z8vmax"},
    {"name":"qc","address":"zeth1dktv9m57ac8cm5umx594rgdh7vf4lqp28ljk94"}
  ]
}
```

验证账户余额：

```bash
# qa 账户 (验证者，100 ZETH 已质押)
curl http://localhost:1317/cosmos/bank/v1beta1/balances/zeth1gj9qdvxt2y0fgczzrtj7le0ttrwg9hsvrvm6nx

# qb 账户 (水龙头账户)
curl http://localhost:1317/cosmos/bank/v1beta1/balances/zeth1fl48vsnmsdzcv85q5d2q4z5ajdha8yu3z8vmax

# qc 账户
curl http://localhost:1317/cosmos/bank/v1beta1/balances/zeth1dktv9m57ac8cm5umx594rgdh7vf4lqp28ljk94
```

**预期余额**：
- qa: 6,900 ZETH (6,900,000,000 uzeth)
- qb: 100 ZETH (100,000,000 uzeth)
- qc: 7,000 ZETH (7,000,000,000 uzeth)

#### 2. 验证前端自动同步

1. **打开浏览器**
   ```
   http://localhost:3000
   ```

2. **清空 IndexedDB（可选，用于测试自动同步）**
   - 按 F12 打开开发者工具
   - 转到 "Application" 标签
   - 左侧选择 "IndexedDB" → "ZETHWallet" → "accounts"
   - 右键点击 "accounts" → "Clear"

3. **刷新页面**
   - 按 F5 刷新页面
   - 前端应该自动从区块链获取默认账户并同步到 IndexedDB

4. **检查控制台日志**

   在浏览器控制台 (F12 → Console) 应该看到：
   ```
   已同步默认账户: qa (zeth1gj9qdvxt2y0fgczzrtj7le0ttrwg9hsvrvm6nx)
   已同步默认账户: qb (zeth1fl48vsnmsdzcv85q5d2q4z5ajdha8yu3z8vmax)
   已同步默认账户: qc (zeth1dktv9m57ac8cm5umx594rgdh7vf4lqp28ljk94)
   ```

5. **查看账户列表**
   - 点击「账户管理」标签
   - 应该看到 "我的账户 (3)"
   - 三个账户 (qa, qb, qc) 应该自动显示
   - 每个账户旁边应该显示正确的余额

6. **验证余额显示**
   - qa: 应显示 "6900.000000 ZETH"
   - qb: 应显示 "100.000000 ZETH"
   - qc: 应显示 "7000.000000 ZETH"

#### 3. 验证账户功能

**查看账户**：
- ✅ 三个默认账户自动显示
- ✅ 余额正确加载
- ✅ 地址与区块链一致

**导入私钥（可选）**：
1. 获取私钥：
   ```bash
   /Users/ashy/go/bin/zethchaind keys export qa --unarmored-hex --unsafe -y --keyring-backend test
   ```

2. 在前端「创建账户」标签
3. 使用「导入账户」功能
4. 输入私钥后，该账户就可以进行转账操作

**转账测试（需要私钥）**：
1. 选择已导入私钥的账户
2. 输入接收地址
3. 输入金额
4. 发送交易
5. 验证余额更新

#### 4. 验证"链上账户"功能

1. 完成一次转账后
2. 切换到「链上账户」标签
3. 应该看到参与转账的账户
4. 显示最近交易记录

### 常见问题排查

#### 问题 1: 前端显示余额为 0

**症状**：账户显示 "0.000000 ZETH"

**原因**：IndexedDB 中的地址与区块链不一致

**解决方法**：
1. 清空 IndexedDB (F12 → Application → IndexedDB → Clear)
2. 刷新页面，让前端重新同步账户

#### 问题 2: 账户未自动显示

**症状**：「我的账户」显示 (0)

**排查步骤**：
1. 检查后端 API 是否正常：
   ```bash
   curl http://localhost:1317/zethchain/explorer/v1/default_accounts
   ```

2. 检查浏览器控制台是否有错误

3. 检查服务是否都在运行：
   ```bash
   lsof -ti:26657,1317,3000
   ```

#### 问题 3: 地址变化

**症状**：每次重启区块链，账户地址都不同

**说明**：这是正常的，因为 `rm -rf ~/.zethchain` 会删除所有数据

**解决方法**：
- 前端会自动重新同步新地址
- 清空 IndexedDB 后刷新即可

### 成功标准

✅ 后端 API 返回三个账户
✅ 前端自动显示三个账户
✅ 余额正确加载和显示
✅ 地址与区块链一致
✅ 控制台显示同步日志
✅ IndexedDB 包含正确数据

### 架构验证

**数据流向**：
```
区块链 (qa, qb, qc 在 config.yml 中定义)
    ↓
REST API (/zethchain/explorer/v1/default_accounts)
    ↓
前端 (AccountManager 初始化)
    ↓
IndexedDB (本地存储)
    ↓
UI 显示 (AccountList 组件)
```

**关键代码位置**：
- 后端 API: [x/explorer/keeper/query_default_accounts.go](zethchain/x/explorer/keeper/query_default_accounts.go)
- 前端 API 调用: [src/services/api.ts](zeth-explorer/src/services/api.ts:208-216)
- 前端同步逻辑: [src/components/AccountManager.tsx](zeth-explorer/src/components/AccountManager.tsx:29-57)

### 下一步

如果所有验证都通过，系统已经完全实现了「后端管理账户，前端自动同步」的架构。

用户可以：
1. 查看所有默认账户及其余额（无需导入）
2. 导入私钥后进行转账
3. 查看链上交易记录
4. 进行 PoS 挖矿
