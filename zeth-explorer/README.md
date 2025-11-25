# ZETH 区块链浏览器

这是 ZETH 区块链的 Web 前端浏览器，使用 React + TypeScript + TailwindCSS 构建。

## 功能特性

### 📊 区块链浏览器（首页）
- **链统计信息**
  - 当前区块高度
  - ZETH 总供应量
  - 活跃验证者数量
- **最新区块信息**
  - 区块高度和时间
  - 区块哈希
  - 交易数量
  - 提议者地址
- **自动刷新**：每 5 秒自动更新数据

### ⛏️ 挖矿界面
- **挖矿操作**
  - Nonce 输入
  - 随机 Nonce 生成
  - CLI 命令提示
- **挖矿历史查询**
  - 挖矿次数统计
  - 总挖矿奖励
  - 上次挖矿时间
  - 当前账户余额
- **挖矿规则说明**
  - PoW 难度要求
  - 奖励金额
  - 冷却时间

## 技术栈

- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **TailwindCSS v3** - 样式框架
- **React Router v6** - 路由管理
- **Axios** - HTTP 客户端

## 快速开始

### 1. 安装依赖

```bash
cd zeth-explorer
npm install
```

### 2. 配置环境变量

`.env` 文件已经配置好默认值：

```env
REACT_APP_REST_API=http://localhost:1317
REACT_APP_RPC_API=http://localhost:26657
REACT_APP_CHAIN_ID=zethchain
REACT_APP_DENOM=uzeth
REACT_APP_DISPLAY_DENOM=ZETH
```

### 3. 启动区块链

在启动前端之前，确保 ZETH 区块链正在运行：

```bash
# 在 zethchain 目录
cd ../zethchain
ignite chain serve
```

等待区块链启动，应该看到类似输出：
```
✔ Blockchain is running
✔ REST API: http://localhost:1317
✔ RPC API: http://localhost:26657
```

### 4. 启动前端开发服务器

```bash
npm start
```

浏览器会自动打开 [http://localhost:3000](http://localhost:3000)

## 项目结构

```
zeth-explorer/
├── public/              # 静态资源
├── src/
│   ├── components/      # React 组件
│   │   ├── Dashboard.tsx           # 首页组件
│   │   └── MiningInterface.tsx     # 挖矿界面组件
│   ├── services/        # 服务层
│   │   └── api.ts                  # API 服务和工具函数
│   ├── App.tsx          # 主应用组件
│   ├── index.tsx        # 入口文件
│   └── index.css        # 全局样式
├── .env                 # 环境配置
├── tailwind.config.js   # TailwindCSS 配置
├── postcss.config.js    # PostCSS 配置
└── package.json         # 依赖配置
```

## 可用的脚本命令

### `npm start`
启动开发服务器
- 自动打开浏览器访问 http://localhost:3000
- 支持热重载

### `npm run build`
构建生产版本
- 输出到 `build/` 目录
- 优化压缩代码

### `npm test`
运行测试

### `npm run eject`
弹出 Create React App 配置（不可逆操作）

## API 接口说明

### REST API 端点

所有 API 请求发送到 `http://localhost:1317`

#### 1. 查询最新区块
```
GET /cosmos/base/tendermint/v1beta1/blocks/latest
```

#### 2. 查询链统计信息
```
GET /zethchain/explorer/v1/chain_stats
```

#### 3. 查询总供应量
```
GET /cosmos/bank/v1beta1/supply/uzeth
```

#### 4. 查询挖矿历史
```
GET /zethchain/mining/v1/mining_history?address={address}
```

#### 5. 查询账户余额
```
GET /cosmos/bank/v1beta1/balances/{address}
```

## 使用说明

### 查看区块链数据

1. 打开首页，即可看到：
   - 最新的链统计信息
   - 最新区块详情
   - 数据每 5 秒自动刷新

### 查询挖矿历史

1. 点击导航栏的"挖矿"进入挖矿界面
2. 输入 ZETH 地址（例如：`zeth1...`）
3. 点击"查询挖矿历史"
4. 查看挖矿统计信息

### 执行挖矿操作

**注意**：挖矿操作需要通过命令行执行，因为需要私钥签名。

1. 在挖矿界面输入 Nonce（或点击"生成随机 Nonce"）
2. 点击"开始挖矿"会显示 CLI 命令
3. 复制命令到终端执行：

```bash
zethchaind tx mining mine <nonce> \
  --from <your-key> \
  --chain-id zethchain \
  --yes
```

例如：
```bash
# 使用 admin 账户挖矿
zethchaind tx mining mine 123456 \
  --from admin \
  --chain-id zethchain \
  --yes
```

## 常见问题

### 1. 无法连接到 API

**问题**：前端显示"无法获取数据"

**解决方案**：
- 确保区块链正在运行：`cd ../zethchain && ignite chain serve`
- 检查 REST API 是否可访问：`curl http://localhost:1317`
- 检查 `.env` 文件中的 API 地址配置

### 2. CORS 错误

**问题**：浏览器控制台显示 CORS 错误

**解决方案**：
- Cosmos SDK 默认启用 CORS，检查 `config/app.toml` 中的 CORS 配置
- 确保 REST API 端口 1317 可访问

### 3. 挖矿失败

**问题**："工作量证明无效"

**解决方案**：
- PoW 难度为 2（哈希前2位必须是 '00'）
- 尝试不同的 Nonce 值
- 使用随机 Nonce 生成器多次尝试

**问题**："挖矿冷却中"

**解决方案**：
- 每个地址有 60 秒冷却时间
- 等待冷却时间结束后再次挖矿

### 4. 构建错误

**问题**：`npm run build` 失败

**解决方案**：
```bash
# 清理并重新安装依赖
rm -rf node_modules package-lock.json
npm install

# 重新构建
npm run build
```

## 开发调试

### 查看 API 响应

打开浏览器开发者工具（F12），在 Network 标签页可以看到所有 API 请求和响应。

### 修改代码

所有组件和 API 服务代码都包含详细的中文注释，方便学习和修改。

主要文件：
- `src/services/api.ts` - API 调用逻辑
- `src/components/Dashboard.tsx` - 首页逻辑
- `src/components/MiningInterface.tsx` - 挖矿界面逻辑

### 添加新功能

1. 在 `src/services/api.ts` 中添加新的 API 函数
2. 在对应组件中导入并使用
3. 更新 UI 显示新数据

## 部署

### 构建生产版本

```bash
npm run build
```

### 使用静态服务器

```bash
# 安装 serve
npm install -g serve

# 运行静态服务器
serve -s build
```

访问 [http://localhost:3000](http://localhost:3000)

## 相关链接

- **REST API**: http://localhost:1317
- **RPC API**: http://localhost:26657
- **Cosmos SDK 文档**: https://docs.cosmos.network
- **React 文档**: https://react.dev
- **TailwindCSS 文档**: https://tailwindcss.com

## License

MIT

---

**教育项目 | ZETH 区块链 © 2026**
