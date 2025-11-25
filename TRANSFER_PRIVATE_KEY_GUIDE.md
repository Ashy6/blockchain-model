# 转账私钥问题解决指南

## 问题描述

当尝试使用自动同步的默认账户（qa、qb、qc）进行转账时，会出现以下错误：

```
input data is not a valid secp256k1 private key
```

## 问题原因

**根本原因**：自动同步的账户没有私钥

当系统自动从区块链同步默认账户时，这些账户的 `privateKey` 字段被设置为空字符串 `''`，因为：
1. 这些账户是区块链上已存在的账户
2. 前端自动同步只是为了让用户查看余额
3. 私钥存储在区块链节点的 keyring 中，前端无法自动获取

当用户尝试使用这些账户转账时：
- 转账需要用私钥签名交易
- CosmJS 的 `DirectSecp256k1Wallet` 会尝试使用空字符串创建钱包
- 导致验证失败：空字符串不是有效的 secp256k1 私钥

## 已实施的修复

### 1. 转账前验证私钥

在 [Transfer.tsx](zeth-explorer/src/components/Transfer.tsx:100-104) 添加了验证：

```typescript
// 检查账户是否有私钥
if (!selectedAccount.privateKey || selectedAccount.privateKey.trim() === '') {
  setError('该账户没有私钥，无法进行转账。\n\n请使用「创建账户」功能导入此账户的私钥后再进行转账。\n\n💡 提示：可以在终端使用以下命令获取默认账户的私钥：\n/Users/ashy/go/bin/zethchaind keys export ' + selectedAccount.name + ' --unarmored-hex --unsafe -y --keyring-backend test');
  return false;
}
```

### 2. 账户列表视觉提示

在 [AccountList.tsx](zeth-explorer/src/components/AccountList.tsx:215-223) 添加了标签：

```typescript
{!account.privateKey || account.privateKey.trim() === '' ? (
  <span className="ml-2 px-2 py-0.5 text-xs rounded bg-yellow-100 text-yellow-700 border border-yellow-200">
    只读
  </span>
) : (
  <span className="ml-2 px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-700 border border-blue-200">
    可转账
  </span>
)}
```

## 解决方法

### 步骤 1：获取账户私钥

在终端执行以下命令获取默认账户的私钥：

```bash
# 导出 qa 账户私钥
/Users/ashy/go/bin/zethchaind keys export qa --unarmored-hex --unsafe -y --keyring-backend test

# 导出 qb 账户私钥
/Users/ashy/go/bin/zethchaind keys export qb --unarmored-hex --unsafe -y --keyring-backend test

# 导出 qc 账户私钥
/Users/ashy/go/bin/zethchaind keys export qc --unarmored-hex --unsafe -y --keyring-backend test
```

**输出示例**：
```
a1b2c3d4e5f6...（64位十六进制字符串）
```

### 步骤 2：在前端导入私钥

1. **打开前端**
   - 访问 http://localhost:3000
   - 进入「账户管理」

2. **点击「创建账户」标签**

3. **使用「导入账户」功能**
   - 输入账户名称：例如 `qa-private`（或直接使用 `qa`，如果不存在的话）
   - 输入私钥：粘贴从步骤 1 获取的 64 位十六进制私钥
   - 点击「导入账户」

4. **验证导入成功**
   - 导入的账户地址应该与只读账户的地址一致
   - 账户旁边显示 🔵 **可转账** 标签

### 步骤 3：使用导入的账户转账

1. 进入「转账」页面
2. 在「发送者」下拉框中选择刚导入的账户
3. 输入接收地址和金额
4. 点击「发送转账」
5. ✅ 转账成功！

## 账户状态说明

### 只读账户（🟡 只读）

- **特征**：自动从区块链同步，没有私钥
- **功能**：
  - ✅ 查看账户地址
  - ✅ 查看 ZETH 余额
  - ✅ 查看 stake 余额
  - ✅ 查看交易记录（在"链上账户"标签）
  - ❌ **不能转账**
  - ❌ 不能挖矿

- **识别方法**：
  - 账户名称旁边显示 🟡 **只读** 标签
  - 转账时会提示"该账户没有私钥"

### 可转账账户（🔵 可转账）

- **特征**：有完整私钥的账户
- **功能**：
  - ✅ 查看账户信息和余额
  - ✅ **可以转账**
  - ✅ 可以挖矿
  - ✅ 可以进行所有链上操作

- **识别方法**：
  - 账户名称旁边显示 🔵 **可转账** 标签
  - 可以在转账页面正常使用

## 完整使用流程示例

### 场景：使用 qa 账户向 qb 账户转账 100 ZETH

1. **获取 qa 私钥**
   ```bash
   /Users/ashy/go/bin/zethchaind keys export qa --unarmored-hex --unsafe -y --keyring-backend test
   ```
   假设输出：`1234567890abcdef...`

2. **导入 qa 私钥**
   - 进入「账户管理」→「创建账户」
   - 选择「导入账户」
   - 账户名称：`qa` 或 `qa-wallet`
   - 私钥：粘贴 `1234567890abcdef...`
   - 点击「导入」

3. **验证导入**
   - 查看「我的账户」列表
   - 找到刚导入的账户，确认地址与只读的 qa 一致
   - 账户旁边显示 🔵 **可转账**

4. **执行转账**
   - 进入「转账」页面
   - 发送者：选择导入的 qa 账户
   - 接收地址：输入 qb 的地址（或复制只读 qb 账户的地址）
   - 金额：`100` ZETH
   - 点击「发送转账」

5. **查看结果**
   - 交易成功后显示交易哈希
   - qa 余额减少（100 ZETH + gas 费）
   - qb 余额增加 100 ZETH
   - 两个账户都被自动标记为"链上账户"

## 常见问题

### Q1: 为什么不能直接使用自动同步的账户转账？

**A**: 出于安全考虑。私钥是敏感信息，区块链节点不会自动将私钥暴露给前端。前端只能获取公开的账户地址和余额信息。如果需要签名交易（转账、挖矿等），必须显式提供私钥。

### Q2: 导入私钥后，会有两个相同的账户吗？

**A**: 取决于你使用的账户名称：
- 如果使用不同的名称（如 `qa` 和 `qa-private`），会显示为两个账户，但地址相同
- 建议：可以删除只读账户，只保留有私钥的账户
- 或者使用不同名称区分：`qa-readonly`（只读）和 `qa`（有私钥）

### Q3: 私钥存储安全吗？

**A**: ⚠️ **仅用于开发和学习**
- 私钥以明文存储在浏览器的 IndexedDB 中
- 本项目仅用于学习目的，**不要在生产环境使用**
- 不要使用真实资金的账户
- 定期清理测试账户的私钥

### Q4: 如何删除只读账户？

在「我的账户」列表中，找到只读账户，点击删除按钮即可。删除只读账户不会影响区块链上的实际账户。

### Q5: 能否让自动同步时直接导入私钥？

**A**: 不推荐，原因：
1. **安全风险**：自动导入私钥会将敏感信息存储在前端
2. **用户意识**：用户应该知道哪些账户有私钥，哪些只是查看
3. **设计原则**：前端应该只获取公开信息，私钥管理由用户控制

## 技术实现细节

### 私钥验证位置

1. **Transfer.tsx (validateForm 函数)**
   - 在转账前验证
   - 检查 `selectedAccount.privateKey` 是否为空
   - 显示友好的错误提示

2. **TransactionService.sendTransfer**
   - 使用 `DirectSecp256k1Wallet.fromKey()` 创建钱包
   - 如果私钥无效，CosmJS 会抛出异常

3. **WalletService.deriveAddressFromPrivateKey**
   - 验证私钥格式
   - 从私钥派生地址

### 账户类型标识

```typescript
// Account 类型定义
interface Account {
  id?: number;
  name: string;
  address: string;
  privateKey: string;  // 空字符串表示只读账户
  createdAt: Date;
  onChain?: boolean;
}
```

### 视觉区分逻辑

```typescript
// 判断是否为只读账户
const isReadOnly = !account.privateKey || account.privateKey.trim() === '';

// 渲染标签
{isReadOnly ? (
  <span className="badge-warning">只读</span>
) : (
  <span className="badge-success">可转账</span>
)}
```

## 相关文档

- [README.md](README.md) - 项目总览和使用指南
- [DEFAULT_ACCOUNTS_SYNC.md](DEFAULT_ACCOUNTS_SYNC.md) - 默认账户自动同步功能说明
- [CLEAR_DUPLICATE_ACCOUNTS.md](CLEAR_DUPLICATE_ACCOUNTS.md) - 清理重复账户指南

## 总结

✅ **问题已修复**：转账前会验证私钥，并显示友好提示
✅ **视觉优化**：账户列表中清晰标识"只读"和"可转账"账户
✅ **用户体验**：错误提示包含解决方法和命令示例
✅ **安全设计**：用户需要显式导入私钥，增强安全意识

**建议工作流**：
1. 使用自动同步查看账户余额（无需私钥）
2. 需要转账时，导入相应账户的私钥
3. 完成操作后，可选择删除私钥（清空 IndexedDB）
