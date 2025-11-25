/**
 * App.tsx - ZETH 区块链浏览器主应用
 *
 * 这是应用的入口组件,负责:
 * - 路由配置
 * - 导航菜单
 * - 页面布局
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, NavLink } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import MiningInterface from './components/MiningInterface';
import AccountManager from './components/AccountManager';
import Transfer from './components/Transfer';
import TransactionHistory from './components/TransactionHistory';
import BlockExplorer from './components/BlockExplorer';

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* ========== 导航栏 ========== */}
        <nav className="bg-white shadow-lg sticky top-0 z-50">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Logo 和标题 */}
              <Link to="/" className="flex items-center space-x-3">
                <div className="text-3xl">⛓️</div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    ZETH Explorer
                  </h1>
                  <p className="text-xs text-gray-500">区块链浏览器</p>
                </div>
              </Link>

              {/* 导航链接 */}
              <div className="flex space-x-1">
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg font-medium transition text-sm ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  <span className="mr-1">🏠</span>
                  首页
                </NavLink>

                <NavLink
                  to="/accounts"
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg font-medium transition text-sm ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  <span className="mr-1">👛</span>
                  账户
                </NavLink>

                <NavLink
                  to="/transfer"
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg font-medium transition text-sm ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  <span className="mr-1">💸</span>
                  转账
                </NavLink>

                <NavLink
                  to="/transactions"
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg font-medium transition text-sm ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  <span className="mr-1">📜</span>
                  交易
                </NavLink>

                <NavLink
                  to="/mining"
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg font-medium transition text-sm ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  <span className="mr-1">⛏️</span>
                  挖矿
                </NavLink>

                <NavLink
                  to="/blocks"
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg font-medium transition text-sm ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  <span className="mr-1">🔍</span>
                  区块
                </NavLink>
              </div>
            </div>
          </div>
        </nav>

        {/* ========== 主要内容区域 ========== */}
        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/accounts" element={<AccountManager />} />
            <Route path="/transfer" element={<Transfer />} />
            <Route path="/transactions" element={<TransactionHistory />} />
            <Route path="/mining" element={<MiningInterface />} />
            <Route path="/blocks" element={<BlockExplorer />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>

        {/* ========== 页脚 ========== */}
        <footer className="bg-gray-800 text-white mt-12">
          <div className="container mx-auto px-6 py-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* 关于 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">关于 ZETH</h3>
                <p className="text-gray-400 text-sm">
                  ZETH 是一个基于 Cosmos SDK 构建的教育性质区块链项目,
                  展示了代币管理、PoW 挖矿和区块链浏览器的实现。
                </p>
              </div>

              {/* 快速链接 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">快速链接</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link to="/" className="text-gray-400 hover:text-white transition">
                      区块浏览器
                    </Link>
                  </li>
                  <li>
                    <Link to="/accounts" className="text-gray-400 hover:text-white transition">
                      账户管理
                    </Link>
                  </li>
                  <li>
                    <Link to="/transfer" className="text-gray-400 hover:text-white transition">
                      转账操作
                    </Link>
                  </li>
                  <li>
                    <Link to="/transactions" className="text-gray-400 hover:text-white transition">
                      交易查询
                    </Link>
                  </li>
                  <li>
                    <Link to="/mining" className="text-gray-400 hover:text-white transition">
                      挖矿面板
                    </Link>
                  </li>
                </ul>
              </div>

              {/* 技术栈 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">技术栈</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>• Cosmos SDK v0.53</li>
                  <li>• Tendermint BFT</li>
                  <li>• React + TypeScript</li>
                  <li>• TailwindCSS</li>
                </ul>
              </div>
            </div>

            {/* 版权信息 */}
            <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400 text-sm">
              <p>
                © 2026 ZETH 区块链 | 教育项目 |
                <a
                  href="https://github.com/cosmos/cosmos-sdk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 hover:text-white transition"
                >
                  Cosmos SDK
                </a>
              </p>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
};

/**
 * 404 页面组件
 */
const NotFound: React.FC = () => {
  return (
    <div className="container mx-auto p-6 text-center">
      <div className="bg-white rounded-lg shadow-md p-12 max-w-md mx-auto mt-12">
        <div className="text-6xl mb-4">🔍</div>
        <h2 className="text-3xl font-bold text-gray-800 mb-2">404</h2>
        <p className="text-gray-600 mb-6">页面未找到</p>
        <Link
          to="/"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          返回首页
        </Link>
      </div>
    </div>
  );
};

export default App;
