/**
 * 交易记录查询组件
 * 支持按交易哈希查询交易详情
 */

import React, { useState, useEffect } from 'react';
import { getTx, formatTime, formatZETH } from '../services/api';
import { useLocation } from 'react-router-dom';

interface Transaction {
  hash: string;
  height: number;
  timestamp: string;
  code: number;
  messages: any[];
  gasUsed: number;
  gasWanted: number;
  memo: string;
}

const TransactionHistory: React.FC = () => {
  const location = useLocation();
  const [txHash, setTxHash] = useState('');
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /**
   * 查询交易
   */
  const handleSearch = React.useCallback(async (hash?: string) => {
    const searchHash = hash || txHash;

    if (!searchHash.trim()) {
      setError('请输入交易哈希');
      return;
    }

    setLoading(true);
    setError('');
    setTransaction(null);

    try {
      const result = await getTx(searchHash);

      if (result) {
        // 解析交易数据
        const tx: Transaction = {
          hash: result.txhash || searchHash,
          height: parseInt(result.height) || 0,
          timestamp: result.timestamp || new Date().toISOString(),
          code: result.code || 0,
          messages: result.tx?.body?.messages || [],
          gasUsed: parseInt(result.gas_used) || 0,
          gasWanted: parseInt(result.gas_wanted) || 0,
          memo: result.tx?.body?.memo || '',
        };

        setTransaction(tx);
      } else {
        setError('未找到该交易');
      }
    } catch (err: any) {
      setError(err.message || '查询交易失败，请检查哈希是否正确');
    } finally {
      setLoading(false);
    }
  }, [txHash]);

  /**
   * 从 URL 参数获取交易哈希
   */
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const hashFromUrl = params.get('hash');

    if (hashFromUrl) {
      setTxHash(hashFromUrl);
      handleSearch(hashFromUrl);
    }
  }, [location.search, handleSearch]);

  /**
   * 解析消息类型
   */
  const parseMessageType = (typeUrl: string): string => {
    const parts = typeUrl.split('.');
    return parts[parts.length - 1];
  };

  /**
   * 渲染转账消息
   */
  const renderTransferMessage = (msg: any, index: number) => {
    const amount = msg.amount?.[0];
    const denom = amount?.denom || '';
    const value = amount?.amount || '0';

    return (
      <div key={index} className="bg-gray-50 rounded-lg p-4 mb-3">
        <h4 className="font-semibold text-gray-900 mb-3">
          💸 转账 #{index + 1}
        </h4>
        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-3 gap-2">
            <span className="text-gray-600">发送者:</span>
            <span className="col-span-2 font-mono text-xs break-all">
              {msg.from_address || msg.fromAddress || 'N/A'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <span className="text-gray-600">接收者:</span>
            <span className="col-span-2 font-mono text-xs break-all">
              {msg.to_address || msg.toAddress || 'N/A'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <span className="text-gray-600">金额:</span>
            <span className="col-span-2 font-semibold text-blue-600">
              {formatZETH(value)} {denom === 'uzeth' ? 'ZETH' : denom}
            </span>
          </div>
        </div>
      </div>
    );
  };

  /**
   * 渲染挖矿消息
   */
  const renderMineMessage = (msg: any, index: number) => {
    return (
      <div key={index} className="bg-gray-50 rounded-lg p-4 mb-3">
        <h4 className="font-semibold text-gray-900 mb-3">
          ⛏️ 挖矿 #{index + 1}
        </h4>
        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-3 gap-2">
            <span className="text-gray-600">矿工:</span>
            <span className="col-span-2 font-mono text-xs break-all">
              {msg.creator || 'N/A'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <span className="text-gray-600">Nonce:</span>
            <span className="col-span-2 font-mono">
              {msg.nonce || 'N/A'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  /**
   * 渲染通用消息
   */
  const renderGenericMessage = (msg: any, type: string, index: number) => {
    return (
      <div key={index} className="bg-gray-50 rounded-lg p-4 mb-3">
        <h4 className="font-semibold text-gray-900 mb-3">
          📝 {type} #{index + 1}
        </h4>
        <pre className="text-xs overflow-x-auto bg-white p-3 rounded border border-gray-200">
          {JSON.stringify(msg, null, 2)}
        </pre>
      </div>
    );
  };

  /**
   * 渲染消息内容
   */
  const renderMessage = (msg: any, index: number) => {
    const typeUrl = msg['@type'] || msg.type_url || '';
    const messageType = parseMessageType(typeUrl);

    if (typeUrl.includes('MsgSend')) {
      return renderTransferMessage(msg, index);
    } else if (typeUrl.includes('MsgMine')) {
      return renderMineMessage(msg, index);
    } else {
      return renderGenericMessage(msg, messageType, index);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">交易记录查询</h1>
          <p className="mt-2 text-gray-600">
            输入交易哈希查询交易详细信息
          </p>
        </div>

        {/* 搜索框 */}
        <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              交易哈希
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="输入交易哈希，例如: A1B2C3D4..."
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                disabled={loading}
              />
              <button
                onClick={() => handleSearch()}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                {loading ? '查询中...' : '查询'}
              </button>
            </div>
          </div>

          {/* 错误提示 */}
          {error && !loading && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* 加载状态 */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* 交易详情 */}
        {transaction && !loading && (
          <div className="bg-white shadow-lg rounded-lg p-6">
            {/* 状态标识 */}
            <div className="mb-6">
              {transaction.code === 0 ? (
                <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  <svg
                    className="mr-1.5 h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  交易成功
                </div>
              ) : (
                <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                  <svg
                    className="mr-1.5 h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  交易失败 (Code: {transaction.code})
                </div>
              )}
            </div>

            {/* 基本信息 */}
            <div className="mb-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  交易哈希
                </label>
                <p className="font-mono text-sm break-all bg-gray-50 p-3 rounded border border-gray-200">
                  {transaction.hash}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    区块高度
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {transaction.height}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    时间
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatTime(transaction.timestamp)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Gas 使用
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {transaction.gasUsed.toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Gas 限制
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {transaction.gasWanted.toLocaleString()}
                  </p>
                </div>
              </div>

              {transaction.memo && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    备注
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                    {transaction.memo}
                  </p>
                </div>
              )}
            </div>

            {/* 消息列表 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                交易消息 ({transaction.messages.length})
              </h3>
              {transaction.messages.length > 0 ? (
                <div>{transaction.messages.map((msg, index) => renderMessage(msg, index))}</div>
              ) : (
                <p className="text-gray-500 text-sm">暂无消息数据</p>
              )}
            </div>
          </div>
        )}

        {/* 使用说明 */}
        {!transaction && !loading && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-md">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">使用说明</h3>
                <div className="mt-2 text-sm text-blue-700 space-y-1">
                  <p>• 在转账成功后，可以复制交易哈希到此处查询</p>
                  <p>• 交易哈希通常是一串 64 位十六进制字符</p>
                  <p>• 查询结果包括交易状态、区块信息、Gas 消耗等详情</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionHistory;
