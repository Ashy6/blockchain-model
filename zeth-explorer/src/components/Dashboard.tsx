/**
 * Dashboard 组件 - ZETH 区块链浏览器首页
 *
 * 功能:
 * - 显示链的统计信息(区块高度、总供应量等)
 * - 显示最新区块列表
 * - 实时更新数据
 */

import React, { useState, useEffect } from 'react';
import { getLatestBlock, getChainStats, getTotalSupply, ChainStats, CosmosBlock, formatZETH, formatTime, formatNumber } from '../services/api';

const Dashboard: React.FC = () => {
  // ==================== 状态管理 ====================
  const [latestBlock, setLatestBlock] = useState<CosmosBlock | null>(null);
  const [stats, setStats] = useState<ChainStats | null>(null);
  const [totalSupply, setTotalSupply] = useState<string>('0');
  const [supplyDelta, setSupplyDelta] = useState<string>('0');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ==================== 数据获取 ====================
  /**
   * 获取所有Dashboard需要的数据
   */
  const fetchData = async () => {
    try {
      setError(null);

      // 并行请求多个API以提高性能
      const [block, chainStats, supply] = await Promise.all([
        getLatestBlock(),
        getChainStats(),
        getTotalSupply().catch(() => ({ amount: '0', denom: 'uzeth' }))
      ]);

      setLatestBlock(block);
      setStats(chainStats);
      // 计算总供应量的变化（与上一刷新比较）
      setSupplyDelta((prev) => {
        const prevVal = typeof prev === 'string' ? prev : '0';
        const delta = BigInt(supply.amount) - BigInt(totalSupply || '0');
        return delta.toString();
      });
      setTotalSupply(supply.amount);
    } catch (err: any) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.message || '获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  // ==================== 生命周期 ====================
  useEffect(() => {
    // 首次加载数据
    fetchData();

    // 每5秒自动刷新数据
    const interval = setInterval(fetchData, 5000);

    // 清理定时器
    return () => clearInterval(interval);
  }, []);

  // ==================== 加载状态 ====================
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  // ==================== 错误状态 ====================
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <p className="text-xl text-gray-800">无法连接到区块链</p>
          <p className="text-gray-600 mt-2">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  // ==================== 渲染界面 ====================
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* ========== 页面标题 ========== */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">
          ZETH 区块链浏览器
        </h1>
        <p className="text-gray-600">
          实时监控 ZETH 区块链的状态和活动
        </p>
      </div>

      {/* ========== 统计卡片区域 ========== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* 卡片1: 当前区块高度 */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">
                当前区块高度
              </p>
              <p className="text-3xl font-bold text-blue-600">
                {stats?.blockHeight
                  ? formatNumber(stats.blockHeight)
                  : latestBlock?.block?.header?.height
                  ? formatNumber(latestBlock.block.header.height)
                  : 'N/A'}
              </p>
            </div>
            <div className="text-4xl text-blue-500">📊</div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            实时区块高度,每秒更新
          </p>
        </div>

        {/* 卡片2: ZETH 总供应量 */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">
                ZETH 总供应量
              </p>
              <p className="text-3xl font-bold text-green-600">
                {formatZETH(totalSupply)}
              </p>
              <p className="text-xs mt-1">
                <span className={String(supplyDelta).startsWith('-') ? 'text-red-600' : 'text-green-600'}>
                  {String(supplyDelta).startsWith('-') ? '↓' : '↑'} 较上次 {formatZETH(supplyDelta)}
                </span>
              </p>
            </div>
            <div className="text-4xl text-green-500">💰</div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            流通中的 ZETH 总量（每 5 秒刷新）
          </p>
        </div>

        {/* 卡片3: 验证者数量 */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">
                验证者节点
              </p>
              <p className="text-3xl font-bold text-purple-600">
                {stats?.validatorCount || '1'}
              </p>
            </div>
            <div className="text-4xl text-purple-500">🔐</div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            保护网络安全的节点数
          </p>
        </div>
      </div>

      {/* ========== 最新区块信息 ========== */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
          <span className="mr-2">🔷</span>
          最新区块
        </h2>

        {latestBlock ? (
          <div className="space-y-4">
            {/* 区块基本信息 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600 mb-1">区块高度</p>
                <p className="text-lg font-mono font-semibold text-gray-800">
                  #{latestBlock.block.header.height}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">出块时间</p>
                <p className="text-lg font-mono text-gray-800">
                  {formatTime(latestBlock.block.header.time)}
                </p>
              </div>

              <div className="md:col-span-2">
                <p className="text-sm text-gray-600 mb-1">区块哈希</p>
                <p className="text-sm font-mono text-gray-800 break-all bg-white p-2 rounded">
                  {latestBlock.block_id.hash}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">交易数量</p>
                <p className="text-lg font-semibold text-gray-800">
                  {latestBlock.block.data.txs?.length || 0} 笔
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">提议者</p>
                <p className="text-sm font-mono text-gray-800 break-all">
                  {latestBlock.block.header.proposer_address || 'N/A'}
                </p>
              </div>
            </div>

            {/* 区块交易列表 */}
            {latestBlock.block.data.txs && latestBlock.block.data.txs.length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  区块中的交易
                </h3>
                <div className="space-y-2">
                  {latestBlock.block.data.txs.map((tx, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded border border-gray-200">
                      <p className="text-xs text-gray-600">交易 #{index + 1}</p>
                      <p className="text-xs font-mono text-gray-800 break-all mt-1">
                        {tx.substring(0, 100)}...
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 无交易提示 */}
            {(!latestBlock.block.data.txs || latestBlock.block.data.txs.length === 0) && (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">此区块暂无交易</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500">加载中...</p>
        )}
      </div>

      {/* ========== 自动刷新提示 ========== */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          🔄 数据每 5 秒自动刷新 | 最后更新: {new Date().toLocaleTimeString('zh-CN')}
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
