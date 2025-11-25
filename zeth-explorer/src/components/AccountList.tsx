/**
 * 账户列表组件
 * 显示本地存储的账户列表及其余额
 */

import React, { useState, useEffect, useCallback } from 'react';
import AccountDB from '../services/accountDB';
import { Account, AccountWithBalance } from '../types/account';
import { getBalance, formatZETH } from '../services/api';

interface AccountListProps {
  searchKeyword?: string;
  onSelectAccount?: (account: Account) => void;
}

const AccountList: React.FC<AccountListProps> = ({
  searchKeyword = '',
  onSelectAccount,
}) => {
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [copiedAddress, setCopiedAddress] = useState<string>('');

  /**
   * 加载账户列表
   */
  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      // 从 IndexedDB 获取账户列表
      const accountList = searchKeyword
        ? await AccountDB.searchAccounts(searchKeyword)
        : await AccountDB.getAllAccounts();

      // 先快速渲染列表，余额稍后异步加载（提升感知速度）
      setAccounts(
        accountList.map((account) => ({
          ...account,
          zethBalance: '0',
          stakeBalance: '0',
        }))
      );
      setLoading(false);

      // 异步批量加载余额，限制并发数，逐个更新（避免长时间 loading）
      const concurrency = 4;
      let index = 0;
      const workers = Array.from({ length: concurrency }).map(async () => {
        while (index < accountList.length) {
          const current = accountList[index++];
          try {
            const balances = await getBalance(current.address);
            const zethBalance = balances.find((b: any) => b.denom === 'uzeth')?.amount || '0';
            const stakeBalance = balances.find((b: any) => b.denom === 'stake')?.amount || '0';
            setAccounts((prev) =>
              prev.map((acc) =>
                acc.address === current.address
                  ? { ...acc, zethBalance, stakeBalance }
                  : acc
              )
            );
          } catch {
            // ignore
          }
        }
      });
      await Promise.all(workers);
    } catch (err: any) {
      setError(err.message || '加载账户失败');
      setLoading(false);
    }
  }, [searchKeyword]);

  /**
   * 初始化和监听搜索关键词变化
   */
  useEffect(() => {
    loadAccounts();
  }, [searchKeyword, loadAccounts]);

  /**
   * 复制地址到剪贴板
   */
  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(''), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  /**
   * 复制私钥到剪贴板
   */
  // 私钥功能已移除
  // const copyPrivateKey = async (privateKey: string) => {
  //   return;
  // };

  /**
   * 选择账户
   */
  const handleSelectAccount = (account: Account) => {
    setSelectedAddress(account.address);
    if (onSelectAccount) {
      onSelectAccount(account);
    }
  };

  /**
   * 刷新余额
   */
  const handleRefresh = () => {
    loadAccounts();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadAccounts}
          className="mt-2 text-blue-600 hover:text-blue-800"
        >
          重试
        </button>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
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
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">暂无账户</h3>
        <p className="mt-1 text-sm text-gray-500">
          {searchKeyword ? '未找到匹配的账户' : '创建你的第一个账户开始使用'}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* 工具栏 */}
      <div className="mb-4 flex justify-between items-center">
        <p className="text-sm text-gray-600">共 {accounts.length} 个账户</p>
        <button
          onClick={handleRefresh}
          className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          刷新余额
        </button>
      </div>

      {/* 账户列表 */}
      <div className="space-y-4">
        {accounts.map((account) => (
          <div
            key={account.id || account.address}
            className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow ${
              selectedAddress === account.address
                ? 'border-blue-500 ring-2 ring-blue-200'
                : 'border-gray-200'
            }`}
            onClick={() => handleSelectAccount(account)}
          >
            {/* 账户名称 */}
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {account.name}
                  {account.onChain && (
                    <span className="ml-2 px-2 py-0.5 text-xs rounded bg-green-100 text-green-700 border border-green-200">链上</span>
                  )}
                  {!account.privateKey || account.privateKey.trim() === '' ? (
                    <span className="ml-2 px-2 py-0.5 text-xs rounded bg-yellow-100 text-yellow-700 border border-yellow-200" title="此账户仅可查看余额，需要导入私钥才能转账">
                      只读
                    </span>
                  ) : (
                    <span className="ml-2 px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-700 border border-blue-200" title="此账户可以进行转账操作">
                      可转账
                    </span>
                  )}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  创建于 {new Date(account.createdAt).toLocaleString('zh-CN')}
                </p>
              </div>
            </div>

            {/* 地址 */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                地址
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono bg-gray-50 px-3 py-2 rounded border border-gray-200 break-all">
                  {account.address}
                </code>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyAddress(account.address);
                  }}
                  className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800 whitespace-nowrap"
                >
                  {copiedAddress === account.address ? '已复制 ✓' : '复制'}
                </button>
              </div>
            </div>

            {/* 余额 */}
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  ZETH 余额
                </label>
                <p className="text-lg font-semibold text-blue-600">
                  {formatZETH(account.zethBalance)}
                </p>
              </div>
              <div>
                {/* <label className="block text-xs font-medium text-gray-500 mb-1">
                  stake 余额
                </label>
                <p className="text-lg font-semibold text-green-600">
                  {formatZETH(account.stakeBalance)}
                </p> */}
              </div>
            </div>

            {/* 私钥操作 */}
            <details className="mt-3 pt-3 border-t border-gray-200">
              <summary className="text-xs font-medium text-red-600 cursor-pointer hover:text-red-800">
                显示私钥 (危险操作)
              </summary>
              <div className="mt-2 p-3 bg-red-50 rounded border border-red-200">
                <p className="text-xs text-red-600 mb-2">
                  ⚠️ 私钥功能已移除，本应用不再展示或保存私钥。
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs font-mono text-gray-800 break-all">
                    （功能已移除）
                  </code>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    className="px-2 py-1 text-xs text-white bg-red-600 rounded hover:bg-red-700 whitespace-nowrap"
                  >
                    已移除
                  </button>
                </div>
              </div>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AccountList;
