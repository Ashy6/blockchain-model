# 解决前端余额显示为 0 的问题

## 🔍 问题原因

当区块链重启时（执行 `rm -rf ~/.zethchain`），Cosmos SDK 会重新生成账户的密钥对，导致账户地址发生变化。但前端 IndexedDB 中保存的还是旧地址，所以查询不到余额。

## ✅ 解决方案

### 步骤 1：清理前端旧账户

1. **打开浏览器访问** http://localhost:3000

2. **打开开发者工具**
   - Windows/Linux: 按 `F12`
   - Mac: 按 `Cmd + Option + I`

3. **清理 IndexedDB**
   - 点击 `Application` 标签（或 `存储`）
   - 展开 `IndexedDB`
   - 展开 `ZETHWallet`
   - 右键点击 `accounts` 表
   - 选择 `Clear` （清除）

   ![清理 IndexedDB](https://i.imgur.com/example.png)

### 步骤 2：获取新的账户信息

运行以下命令获取最新的账户私钥：

```bash
./GET_ACCOUNT_INFO.sh
```

或者直接查看：

```bash
# qa 账户
zethchaind keys export qa --unarmored-hex --unsafe -y --keyring-backend test

# qb 账户  
zethchaind keys export qb --unarmored-hex --unsafe -y --keyring-backend test

# qc 账户
zethchaind keys export qc --unarmored-hex --unsafe -y --keyring-backend test
```

### 步骤 3：重新导入账户

1. **进入钱包管理页面**
   - 在前端导航栏点击「钱包管理」或「账户」

2. **导入账户**
   - 点击「导入账户」或「通过私钥导入」
   - 输入账户名称（qa、qb、qc）
   - 粘贴对应的私钥（64位十六进制）
   - 点击「导入」

3. **验证余额**
   - 导入后应该能看到正确的余额：
     - qa: 6900 ZETH（质押了 100 ZETH）
     - qb: 7000 ZETH
     - qc: 7000 ZETH

## 🚨 注意事项

### 避免地址变化的方法

如果不想每次重启都要重新导入账户，可以：

**方法 1：不要删除 `~/.zethchain` 目录**
```bash
# 停止区块链但保留数据
pkill -9 zethchaind

# 重新启动（不删除数据）
ignite chain serve
```

**方法 2：备份密钥**
```bash
# 备份 keyring
cp -r ~/.zethchain/keyring-test ~/.zethchain/keyring-test.backup

# 恢复时
rm -rf ~/.zethchain/keyring-test
cp -r ~/.zethchain/keyring-test.backup ~/.zethchain/keyring-test
```

**方法 3：使用固定的助记词**

在 `config.yml` 中配置固定的助记词（生产环境不推荐）：

```yaml
accounts:
  - name: qa
    coins:
      - 7000000000uzeth
    mnemonic: "your fixed mnemonic here..."
```

## 📊 验证余额

### 通过 API 验证
```bash
# 查询 qa 账户
curl http://localhost:1317/cosmos/bank/v1beta1/balances/zeth1gj9qdvxt2y0fgczzrtj7le0ttrwg9hsvrvm6nx

# 查询 qb 账户
curl http://localhost:1317/cosmos/bank/v1beta1/balances/zeth1dktv9m57ac8cm5umx594rgdh7vf4lqp28ljk94

# 查询 qc 账户
curl http://localhost:1317/cosmos/bank/v1beta1/balances/zeth13zhp6xw9f92lv8qzukkjpnllz4lxvmp5hmqrq9
```

### 通过命令行验证
```bash
zethchaind query bank balances $(zethchaind keys show qa --keyring-backend test -a)
zethchaind query bank balances $(zethchaind keys show qb --keyring-backend test -a)
zethchaind query bank balances $(zethchaind keys show qc --keyring-backend test -a)
```

## 🔧 常见问题

### Q: 为什么 qa 的余额是 6900 而不是 7000？
A: qa 是验证者账户，质押了 100 ZETH 用于验证。可用余额 = 7000 - 100 = 6900 ZETH

### Q: 导入后余额还是 0？
A: 
1. 检查区块链是否正在运行：`curl http://localhost:26657/status`
2. 检查账户地址是否匹配：运行 `./GET_ACCOUNT_INFO.sh` 对比地址
3. 清除浏览器缓存并刷新页面

### Q: 如何避免每次都要重新导入？
A: 使用 `./STOP_ALL.sh` 停止服务，不要手动删除 `~/.zethchain` 目录

## 📝 快速命令

```bash
# 获取账户信息
./GET_ACCOUNT_INFO.sh

# 查看区块链状态
curl http://localhost:1317/zethchain/explorer/v1/chain_stats | jq .

# 查看所有账户
zethchaind keys list --keyring-backend test

# 查看单个账户余额
zethchaind query bank balances <address>
```

---

**问题解决了吗？如果还有问题，请查看 [README.md](README.md) 或提交 Issue。**
