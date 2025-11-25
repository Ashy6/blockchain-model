/**
 * ValidatorInterface 组件 - PoS 验证者界面
 *
 * 功能:
 * - PoS 验证者自动出块
 * - 查询验证历史
 * - 显示验证统计
 */

import React, { useState, useEffect } from 'react';
import { getMiningHistory, getBalance, MiningHistory, formatZETH, formatTime } from '../services/api';
import AccountDB from '../services/accountDB';
import { Account } from '../types/account';

const MiningInterface: React.FC = () => {
  // ==================== 状态管理 ====================
  // 查询历史相关
  const [address, setAddress] = useState('');
  const [history, setHistory] = useState<MiningHistory | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // PoS 验证者相关
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationStats, setValidationStats] = useState({
    blocksProduced: 0,
    totalRewards: 0,
    startTime: 0,
    lastBlockTime: 0,
  });
  const [validationError, setValidationError] = useState('');
  const [countdown, setCountdown] = useState(0);

  // ==================== 初始化 ====================
  /**
   * 加载账户列表
   */
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const accountList = await AccountDB.getAllAccounts();
        setAccounts(accountList);

        // 默认选择第一个账户
        if (accountList.length > 0) {
          setSelectedAccount(accountList[0]);
          setAddress(accountList[0].address);
        }
      } catch (err) {
        console.error('加载账户失败:', err);
      }
    };

    loadAccounts();
  }, []);

  // ==================== PoS 验证核心逻辑 ====================
  /**
   * 产生区块（PoS 简化实现）
   */
  const produceBlock = async () => {
    if (!selectedAccount) {
      setValidationError('请先选择验证者账户');
      return;
    }

    try {
      setValidationError('');

      // 动态导入 TransactionService
      const { TransactionService } = await import('../services/transactionService');

      // 发送挖矿交易
      const result = await TransactionService.sendMineTransaction(
        selectedAccount.privateKey,
        {
          minerAddress: selectedAccount.address,
          nonce: Date.now(), // 使用时间戳作为nonce
        }
      );

      // 检查交易是否成功
      if (TransactionService.isTransactionSuccess(result)) {
        // 更新统计信息
        setValidationStats(prev => ({
          ...prev,
          blocksProduced: prev.blocksProduced + 1,
          totalRewards: prev.totalRewards + 10, // 每个区块奖励 10 ZETH
          lastBlockTime: Date.now(),
        }));

        console.log('区块产生成功:', result.transactionHash);
      } else {
        const errorMsg = TransactionService.formatTransactionError(result);
        setValidationError(`产生区块失败: ${errorMsg}`);
      }
    } catch (err: any) {
      console.error('提交区块失败:', err);
      setValidationError(`提交区块失败: ${err.message}`);
    }
  };

  /**
   * PoS 验证循环 - 定时产生区块
   */
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let countdownId: NodeJS.Timeout;

    if (isValidating && selectedAccount) {
      // 初始化统计
      if (validationStats.startTime === 0) {
        setValidationStats({
          blocksProduced: 0,
          totalRewards: 0,
          startTime: Date.now(),
          lastBlockTime: 0,
        });
      }

      // 立即尝试产生第一个区块
      produceBlock();

      // 设置定时器，每 65 秒尝试产生一个区块（避开 60 秒冷却期）
      setCountdown(65);
      intervalId = setInterval(() => {
        if (isValidating) {
          produceBlock();
          setCountdown(65);
        }
      }, 65000);

      // 倒计时
      countdownId = setInterval(() => {
        setCountdown(prev => Math.max(0, prev - 1));
      }, 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (countdownId) clearInterval(countdownId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isValidating, selectedAccount]);

  /**
   * 停止验证
   */
  const stopValidating = () => {
    setIsValidating(false);
    setCountdown(0);
  };

  // ==================== 查询验证历史 ====================
  /**
   * 查询指定地址的验证历史
   */
  const handleQueryHistory = async (queryAddress?: string) => {
    const searchAddress = queryAddress || address;

    if (!searchAddress) {
      setError('请输入钱包地址');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [miningHistory, balanceData] = await Promise.all([
        getMiningHistory(searchAddress),
        getBalance(searchAddress).catch(() => [])
      ]);

      setHistory(miningHistory);

      const zethBalance = balanceData.find(b => b.denom === 'uzeth');
      setBalance(zethBalance ? zethBalance.amount : '0');
    } catch (err: any) {
      setError(err.message || '查询失败');
      setHistory(null);
      setBalance(null);
    } finally {
      setLoading(false);
    }
  };

  // ==================== 渲染界面 ====================
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* ========== 页面标题 ========== */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🏛️ PoS 验证者面板
          </h1>
          <p className="text-gray-600">
            通过权益证明（Proof of Stake）验证区块并获得奖励
          </p>
        </div>

        {/* ========== PoS 说明卡片 ========== */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-md">
          <h3 className="font-semibold text-blue-900 mb-2">📖 PoS 验证规则</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>验证方式:</strong> 权益证明（PoS），无需计算哈希</li>
            <li>• <strong>区块奖励:</strong> 每产生一个区块获得 10 ZETH</li>
            <li>• <strong>出块间隔:</strong> 验证者每 65 秒自动产生一个区块</li>
            <li>• <strong>冷却时间:</strong> 每个验证者 60 秒只能产生一次区块</li>
          </ul>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ========== 左侧：验证者操作 ========== */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              🚀 开始验证
            </h2>

            {/* 验证者账户选择 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                验证者账户
              </label>
              <select
                value={selectedAccount?.address || ''}
                onChange={(e) => {
                  const account = accounts.find(acc => acc.address === e.target.value);
                  setSelectedAccount(account || null);
                  if (account) setAddress(account.address);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isValidating}
              >
                <option value="">选择验证者账户</option>
                {accounts.map((account) => (
                  <option key={account.address} value={account.address}>
                    {account.name} - {account.address.slice(0, 20)}...
                  </option>
                ))}
              </select>
            </div>

            {/* 验证控制按钮 */}
            <div className="mb-4">
              {!isValidating ? (
                <button
                  onClick={() => setIsValidating(true)}
                  disabled={!selectedAccount}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                >
                  🏛️ 开始验证
                </button>
              ) : (
                <button
                  onClick={stopValidating}
                  className="w-full px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
                >
                  ⏹️ 停止验证
                </button>
              )}
            </div>

            {/* 验证统计 */}
            {isValidating && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                  <span className="animate-pulse mr-2">🔹</span>
                  验证中...
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">已产生区块:</span>
                    <span className="font-semibold text-blue-600">{validationStats.blocksProduced} 个</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">累计奖励:</span>
                    <span className="font-semibold text-green-600">{validationStats.totalRewards} ZETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">下次出块:</span>
                    <span className="font-semibold text-purple-600">{countdown} 秒</span>
                  </div>
                  {validationStats.lastBlockTime > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">上次出块:</span>
                      <span className="font-mono text-xs">
                        {new Date(validationStats.lastBlockTime).toLocaleTimeString('zh-CN')}
                      </span>
                    </div>
                  )}
                </div>

                {/* 进度条 */}
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${((65 - countdown) / 65) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {/* 验证错误 */}
            {validationError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-800">❌ {validationError}</p>
              </div>
            )}

            {/* 当前版本禁用签名与交易发送，不显示交易哈希 */}
            
            {/* 使用说明 */}
            <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-md">
              <p className="text-xs text-yellow-800">
                💡 <strong>提示:</strong> PoS 验证者无需计算哈希，系统会自动按时产生区块。
                每个验证者有 60 秒冷却时间，确保公平分配出块机会。
              </p>
            </div>
          </div>

          {/* ========== 右侧：验证历史查询 ========== */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              📊 验证历史查询
            </h2>

            {/* 地址输入 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                验证者地址
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                placeholder="输入地址,例如: zeth1abc..."
              />
            </div>

            {/* 查询按钮 */}
            <button
              onClick={() => handleQueryHistory()}
              disabled={loading || !address}
              className={`w-full px-6 py-3 rounded-lg font-semibold text-white transition ${loading || !address
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
              {loading ? '查询中...' : '🔍 查询历史'}
            </button>

            {/* 错误提示 */}
            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">❌ {error}</p>
              </div>
            )}

            {/* 验证历史显示 */}
            {history && (
              <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  验证统计
                </h3>

                <div className="space-y-3">
                  {/* 验证次数 */}
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-xs text-gray-600 mb-1">产生区块数</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {history.mineCount} 个
                    </p>
                  </div>

                  {/* 总奖励 */}
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-xs text-gray-600 mb-1">累计奖励</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatZETH(history.totalMined)}
                    </p>
                  </div>

                  {/* 上次验证时间 */}
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-xs text-gray-600 mb-1">上次出块时间</p>
                    <p className="text-sm font-mono text-gray-800">
                      {history.lastMineTime !== '0'
                        ? formatTime(history.lastMineTime)
                        : '尚未出块'}
                    </p>
                  </div>

                  {/* 当前余额 */}
                  {balance !== null && (
                    <div className="bg-white p-3 rounded-lg shadow-sm">
                      <p className="text-xs text-gray-600 mb-1">当前 ZETH 余额</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {formatZETH(balance)}
                      </p>
                    </div>
                  )}
                </div>

                {/* 验证进度条 */}
                {history.mineCount !== '0' && (
                  <div className="mt-4">
                    <p className="text-xs text-gray-600 mb-2">
                      验证成就进度
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min((parseInt(history.mineCount) / 100) * 100, 100)}%`
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {history.mineCount} / 100 个区块
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MiningInterface;
