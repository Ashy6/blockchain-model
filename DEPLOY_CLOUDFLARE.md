# 在 Cloudflare 分别部署前端与后端（代理）

## 概览

- 前端：`zeth-explorer` 使用 Cloudflare Pages 构建与托管
- 后端：使用 Cloudflare Workers 作为 REST/RPC/Faucet 的反向代理，指向你运行在服务器上的真实链与 Faucet
- 说明：Cloudflare 不运行 Cosmos/Tendermint 节点或本地二进制（`zethchaind`）；你需要在可公网访问的主机上运行链与 Faucet，然后用 Workers 统一暴露到你的域名

## 前置准备

- 一个已接入 Cloudflare 的域名（例如 `YOUR_DOMAIN`）
- 在你的服务器上启动：
  - 链 RPC：`http://YOUR_BACKEND_HOST:26657`
  - 链 REST：`http://YOUR_BACKEND_HOST:1317`
  - Faucet：`http://YOUR_BACKEND_HOST:4500`
- 安装 CLI：`npm i -g wrangler` 并执行 `wrangler login`

## 部署后端代理（Cloudflare Workers）

1. 修改 `cloudflare-workers/wrangler.toml`
   - 在 `[vars]` 中设置：
     - `REST_ORIGIN = "http://YOUR_BACKEND_HOST:1317"`
     - `RPC_ORIGIN  = "http://YOUR_BACKEND_HOST:26657"`
     - `FAUCET_ORIGIN = "http://YOUR_BACKEND_HOST:4500"`
   - 绑定生产路由（示例）：

     ```toml
     [[routes]]
     pattern = "api.YOUR_DOMAIN/*"
     zone_id = "YOUR_ZONE_ID"
     ```

2. 部署 Workers
   - 进入 `cloudflare-workers` 目录
   - 运行：`wrangler deploy`
   - 记录输出的 `workers.dev` 子域或确认路由已绑定到 `api.YOUR_DOMAIN`

### Workers 路由

- `GET https://api.YOUR_DOMAIN/health`：同时检查 REST 与 RPC
- `/*` 路由：
  - `https://api.YOUR_DOMAIN/rest/...` 代理到 `REST_ORIGIN`
  - `https://api.YOUR_DOMAIN/rpc/...`  代理到 `RPC_ORIGIN`
  - `https://api.YOUR_DOMAIN/faucet`   代理到 `FAUCET_ORIGIN`

## 部署前端（Cloudflare Pages）

1. 将仓库推送到你的 Git 托管（GitHub/GitLab）
2. 在 Cloudflare Pages 中创建新项目，选择此仓库的 `zeth-explorer` 目录作为构建根（或在 Pages 项目设置中设置工作目录）
3. Pages 构建设置：
   - 构建命令：`npm run build`
   - 输出目录：`build`
   - Node 版本：`18+`（参考 CRA 兼容）
4. 在 Pages 项目中设置环境变量（生产/预览都设置）：
   - `REACT_APP_REST_API=https://api.YOUR_DOMAIN/rest`
   - `REACT_APP_RPC_API=https://api.YOUR_DOMAIN/rpc`
   - `REACT_APP_CHAIN_ID=zethchain`
   - `REACT_APP_DENOM=uzeth`
   - `REACT_APP_DISPLAY_DENOM=ZETH`
   - `REACT_APP_FAUCET_API=https://api.YOUR_DOMAIN/faucet`
5. 触发构建并发布，前端将通过 Workers 域名访问后端 API

## 验证

- 访问 `https://api.YOUR_DOMAIN/health`，应返回 `{ ok: true, rest: 200, rpc: 200 }`
- 打开 Pages 站点（例如 `https://zeth-explorer.YOUR_DOMAIN`），在页面中：
  - 区块高度、节点状态可正常显示
  - Faucet 充值成功返回 200，结果中包含交易广播信息

## 安全注意

- 不要在仓库或 Pages 环境变量中存放私钥；Faucet 私钥保存在你的服务器 keyring 中（`--keyring-backend test` 仅用于测试）
- 如需生产环境 Faucet，建议：
  - 使用更安全的账户与限流策略
  - 在 Workers 对 `/faucet` 路由增加额外校验（IP 限制、验证码、速率限制）

## 常见问题

- 如果前端访问出现 CORS 错误：Workers 已设置 `Access-Control-Allow-Origin`，请确认前端域与请求域一致；必要时将 `origin` 头置空或改为 `*`
- 如果 `wrangler deploy` 报类型错误：本仓库已移除 TS-only 导入，入口为纯 JS（`cloudflare-workers/src/index.js`）
- Faucet 返回 `127`：多为后端未安装或未找到 `zethchaind` 二进制；在服务器上安装并将其加入 `PATH` 或通过 `ZETHCHAIND_PATH` 指定路径

## 本地开发对齐

- `.env` 已统一 Faucet 端口为 `4500`
- 本地可运行 `./START_ALL.sh` 启动链与前端，并单独运行 `node faucet-server.js`
- 前端本地开发时 `.env` 指向 `http://localhost`；部署到 Pages 时通过项目环境变量覆盖为 `https://api.YOUR_DOMAIN/*`

## 部署脚本

```
npm i -g wrangler

wrangler deploy

wrangler deploy

npm install && npm run build

wrangler pages publish build --project-name zeth-explorer
```
