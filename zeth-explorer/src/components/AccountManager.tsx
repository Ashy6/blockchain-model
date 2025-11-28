/**
 * 账户管理主界面
 * 整合账户创建和账户列表功能
 */

import React, { useState, useEffect } from 'react';
import CreateAccount from './CreateAccount';
import AccountList from './AccountList';
import AccountDB from '../services/accountDB';
import WalletService from '../services/walletService';
import { getBalance, faucetCredit, getTxsByAddress, formatZETH, formatNumber } from '../services/api';
import { Account } from '../types/account';

type View = 'list' | 'create' | 'onchain';

// 用于防止重复初始化的全局标记
let isInitializing = false;

const AccountManager: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('list');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [accountCount, setAccountCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [onChainAccounts, setOnChainAccounts] = useState<Account[]>([]);
  const [loadingOnChain, setLoadingOnChain] = useState(false);
  const [onChainBalances, setOnChainBalances] = useState<Record<string, { uzeth: string; stake: string }>>({});
  const [onChainTxs, setOnChainTxs] = useState<Record<string, any[]>>({});

  /**
   * 初始化默认账户（带防重复机制）
   */
  const initializeDefaultAccounts = async () => {
    // 防止并发初始化
    if (isInitializing) {
      console.log('初始化已在进行中，跳过');
      return;
    }

    isInitializing = true;

    try {
      const defaultNames = ['qa', 'qb', 'qc'];

      // 批量检查所有默认账户的存在性
      const existsChecks = await Promise.all(
        defaultNames.map(async (name) => ({
          name,
          exists: await AccountDB.isNameExists(name),
        }))
      );

      // 只创建不存在的账户
      const toCreate = existsChecks.filter((check) => !check.exists);

      if (toCreate.length > 0) {
        console.log(`需要创建 ${toCreate.length} 个默认账户`);

        for (const { name } of toCreate) {
          const account = await WalletService.createAccount(name);
          await AccountDB.addAccount(account);
          console.log(`默认账户 "${name}" 创建成功`);
        }
      } else {
        console.log('所有默认账户已存在');
      }

      // 创建/存在后，尝试自动充值
      const allAccounts = await AccountDB.getAllAccounts();
      const targetAccounts = allAccounts.filter(acc => defaultNames.includes(acc.name));
      for (const acc of targetAccounts) {
        try {
          const balances = await getBalance(acc.address);
          const uzethBalance = balances.find((b: any) => b.denom === 'uzeth')?.amount || '0';
          if (BigInt(uzethBalance) < BigInt(100000000)) { // 少于 100 ZETH
            console.log(`为默认账户 ${acc.name}(${acc.address}) 充值 100 ZETH...`);
            await faucetCredit(acc.address, '100000000uzeth');
          } else {
            console.log(`默认账户 ${acc.name} 余额已达标: ${uzethBalance} uzeth`);
          }
        } catch (e) {
          console.warn(`自动充值默认账户 ${acc.name} 失败:`, e);
        }
      }

      const newCount = await AccountDB.getAccountCount();
      setAccountCount(newCount);
      setIsInitialized(true);
    } catch (error) {
      console.error('初始化账户失败:', error);
      setIsInitialized(true); // 即使失败也标记为已初始化
    } finally {
      isInitializing = false;
    }
  };

  /**
   * 组件挂载时初始化
   */
  useEffect(() => {
    initializeDefaultAccounts();
  }, []);

  useEffect(() => {
    if (currentView === 'onchain') {
      loadOnChainAccounts();
    }
  }, [currentView]);

  /**
   * 刷新账户数量
   */
  const refreshAccountCount = async () => {
    const count = await AccountDB.getAccountCount();
    setAccountCount(count);
  };

  /**
   * 账户创建成功回调
   */
  const handleAccountCreated = async () => {
    await refreshAccountCount();
    setCurrentView('list');
  };

  /**
   * 取消创建账户
   */
  const handleCancelCreate = () => {
    setCurrentView('list');
  };

  /**
   * 加载链上账户（本地已标记）
   */
  const loadOnChainAccounts = async () => {
    setLoadingOnChain(true);
    try {
      const list = await AccountDB.getOnChainAccounts();
      setOnChainAccounts(list);
      setOnChainBalances({});
      setOnChainTxs({});

      // 并发加载每个链上账户的余额和最近交易
      const concurrency = 4;
      let index = 0;
      const workers = Array.from({ length: concurrency }).map(async () => {
        while (index < list.length) {
          const acc = list[index++];
          // 加载余额
          try {
            const balances = await getBalance(acc.address);
            const uzethBalance = balances.find((b: any) => b.denom === 'uzeth')?.amount || '0';
            const stakeBalance = balances.find((b: any) => b.denom === 'stake')?.amount || '0';
            setOnChainBalances((prev) => ({
              ...prev,
              [acc.address]: { uzeth: uzethBalance, stake: stakeBalance },
            }));
          } catch (e) {
            // 忽略余额加载错误
          }
          // 加载最近交易（最多 5 条）
          try {
            const txs = await getTxsByAddress(acc.address);
            setOnChainTxs((prev) => ({
              ...prev,
              [acc.address]: (txs || []).slice(0, 5),
            }));
          } catch (e) {
            // 忽略交易加载错误
          }
        }
      });
      await Promise.all(workers);
    } catch (e) {
      console.error('加载链上账户失败:', e);
    } finally {
      setLoadingOnChain(false);
    }
  };

  if (!isInitialized) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">初始化账户系统...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">账户管理</h1>
          <p className="mt-2 text-gray-600">
            管理你的区块链账户，查看余额和转账记录
          </p>
        </div>

        {/* Tab 导航 */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex -mb-px space-x-8">
            <button
              onClick={() => setCurrentView('list')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                currentView === 'list'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              我的账户 ({accountCount})
            </button>
            <button
              onClick={() => setCurrentView('create')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                currentView === 'create'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              创建账户
            </button>
            <button
              onClick={() => setCurrentView('onchain')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                currentView === 'onchain'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              链上账户
            </button>
          </nav>
        </div>

        {/* 我的账户视图 */}
        {currentView === 'list' && (
          <div>
            {/* 搜索栏 */}
            <div className="mb-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="搜索账户名称或地址..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            {/* 账户列表 */}
            <AccountList searchKeyword={searchKeyword} />
          </div>
        )}

        {/* 创建账户视图 */}
        {currentView === 'create' && (
          <CreateAccount
            onAccountCreated={handleAccountCreated}
            onCancel={handleCancelCreate}
          />
        )}

        {/* 链上账户视图 */}
        {currentView === 'onchain' && (
          <div className="bg-white shadow-lg rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              链上账户查询
            </h2>
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    此功能展示本地账户中，已发生过链上交易或拥有链上余额的账户。
                    <br />
                    小提示：完成一次转账后，账户会自动被标记为“链上账户”。
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-4 flex justify-between items-center">
              <p className="text-sm text-gray-600">共 {onChainAccounts.length} 个链上账户</p>
              <button
                onClick={loadOnChainAccounts}
                className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                刷新列表
              </button>
            </div>

            {loadingOnChain ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {onChainAccounts.length === 0 && (
                  <div className="text-center py-12">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">暂无链上账户</h3>
                    <p className="mt-1 text-sm text-gray-500">完成一次转账后，这里会显示你的链上账户</p>
                  </div>
                )}

                {onChainAccounts.map((acc) => (
                  <div key={acc.id || acc.address} className="bg-white border rounded-lg p-4 border-gray-200">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {acc.name}
                          <span className="ml-2 px-2 py-0.5 text-xs rounded bg-green-100 text-green-700 border border-green-200">链上账户</span>
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          创建于 {new Date(acc.createdAt).toLocaleString('zh-CN')}
                        </p>
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-500 mb-1">地址</label>
                      <code className="flex-1 text-sm font-mono bg-gray-50 px-3 py-2 rounded border border-gray-200 break-all">
                        {acc.address}
                      </code>
                    </div>

                    {/* 余额信息 */}
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div className="bg-gray-50 rounded p-3">
                        <p className="text-xs text-gray-500">ZETH 余额</p>
                        <p className="text-sm font-semibold text-green-700">
                          {formatZETH(onChainBalances[acc.address]?.uzeth || '0')}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded p-3">
                        <p className="text-xs text-gray-500">stake 余额</p>
                        <p className="text-sm font-semibold text-indigo-700">
                          {formatNumber(onChainBalances[acc.address]?.stake || '0')}
                        </p>
                      </div>
                    </div>

                    {/* 最近交易 */}
                    <div className="mt-4">
                      <label className="block text-xs font-medium text-gray-500 mb-1">最近交易</label>
                      {onChainTxs[acc.address] && onChainTxs[acc.address].length > 0 ? (
                        <ul className="divide-y divide-gray-100">
                          {onChainTxs[acc.address].map((tx: any, i: number) => {
                            const time = tx.timestamp || tx.time || '';
                            const status = tx.code === 0 ? '成功' : '失败';
                            let direction = '';
                            let amountText = '';
                            try {
                              const msg = tx?.tx?.body?.messages?.[0];
                              if (msg && (msg['@type'] === '/cosmos.bank.v1beta1.MsgSend' || msg.type === '/cosmos.bank.v1beta1.MsgSend')) {
                                const from = msg.from_address;
                                const to = msg.to_address;
                                const amount0 = msg.amount?.[0];
                                const denom = amount0?.denom || '';
                                const amount = amount0?.amount || '0';
                                direction = from === acc.address ? '转出' : (to === acc.address ? '转入' : '交易');
                                amountText = denom === 'uzeth' ? `${formatZETH(amount)} ZETH` : `${formatNumber(amount)} ${denom}`;
                              } else {
                                direction = '交易';
                              }
                            } catch {}
                            return (
                              <li key={tx.txhash || i} className="py-2 flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-gray-900">
                                    {direction} · {amountText || (tx.txhash ? tx.txhash.slice(0, 10) + '...' : '')}
                                  </p>
                                  <p className="text-xs text-gray-500">{time ? new Date(time).toLocaleString('zh-CN') : ''}</p>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded ${tx.code === 0 ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>{status}</span>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="text-xs text-gray-400">暂无交易记录</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountManager;
