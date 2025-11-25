/**
 * 区块浏览器组件
 * 显示区块列表和区块详情，包括交易信息
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const REST_API = 'http://localhost:1317';

// 区块信息接口
interface BlockInfo {
  blockHeight: string;
  blockHash: string;
  parentHash: string;
  blockTime: string;
  gasLimit: string;
  gasUsed: string;
  txCount: string;
  proposer: string;
  transactions: Transaction[];
}

// 交易详情接口
interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  denom: string;
  gasPrice: string;
  gasLimit: string;
  gasUsed: string;
  nonce: number;
  input: string;
  signature: string;
  code: number;
  log: string;
}

const BlockExplorer: React.FC = () => {
  const [currentBlock, setCurrentBlock] = useState<number>(0);
  const [selectedBlock, setSelectedBlock] = useState<BlockInfo | null>(null);
  const [recentBlocks, setRecentBlocks] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchHeight, setSearchHeight] = useState('');
  const [expandedTx, setExpandedTx] = useState<string | null>(null);

  /**
   * 获取当前区块高度
   */
  const fetchCurrentHeight = async () => {
    try {
      const response = await axios.get(`${REST_API}/cosmos/base/tendermint/v1beta1/blocks/latest`);
      const height = parseInt(response.data.block.header.height);
      setCurrentBlock(height);
      return height;
    } catch (err) {
      console.error('获取当前区块高度失败:', err);
      return 0;
    }
  };

  /**
   * 获取区块详情
   */
  const fetchBlockInfo = async (height: number) => {
    setLoading(true);
    setError('');

    try {
      // 0. 先检查区块高度是否有效
      if (height > currentBlock && currentBlock > 0) {
        setError(`区块高度 ${height} 超过了当前最新高度 ${currentBlock}`);
        setLoading(false);
        return;
      }

      // 1. 获取 Cosmos 标准区块信息
      const blockResponse = await axios.get(`${REST_API}/cosmos/base/tendermint/v1beta1/blocks/${height}`);
      const blockData = blockResponse.data;

      // 2. 获取该高度的所有交易
      let transactions: Transaction[] = [];

      if (blockData.block?.data?.txs && blockData.block.data.txs.length > 0) {
        // 从区块原始数据中提取交易
        const txHashes = blockData.block.data.txs;

        // 并行查询所有交易详情
        const txPromises = txHashes.map(async (txBase64: string) => {
          try {
            // 1. 计算交易哈希（Base64 -> bytes -> SHA256 -> uppercase hex）
            // 将 base64 解码为 Uint8Array
            const binaryString = atob(txBase64);
            const txBytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              txBytes[i] = binaryString.charCodeAt(i);
            }

            // 计算 SHA256 哈希
            const hashBuffer = await crypto.subtle.digest('SHA-256', txBytes);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const txHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

            // 2. 通过哈希查询交易详情
            const txResponse = await axios.get(`${REST_API}/cosmos/tx/v1beta1/txs/${txHash}`);
            const txData = txResponse.data;
            const txr = txData.tx_response;
            const tx = txData.tx;

            // 3. 解析交易内容
            const messages = tx?.body?.messages || [];
            let from = '';
            let to = '';
            let value = '0';
            let denom = 'uzeth';

            if (messages.length > 0) {
              const msg = messages[0];
              if (msg['@type'] === '/cosmos.bank.v1beta1.MsgSend') {
                from = msg.from_address || msg.fromAddress || '';
                to = msg.to_address || msg.toAddress || '';
                if (msg.amount && msg.amount.length > 0) {
                  value = msg.amount[0].amount || '0';
                  denom = msg.amount[0].denom || 'uzeth';
                }
              } else if (msg['@type'] === '/zethchain.mining.v1.MsgMine') {
                from = msg.creator || '';
                to = msg.miner || msg.creator || '';
                value = '0';
              }
            }

            return {
              hash: txr.txhash || txHash,
              from,
              to,
              value,
              denom,
              gasPrice: '0.025',
              gasLimit: txr.gas_wanted?.toString() || '0',
              gasUsed: txr.gas_used?.toString() || '0',
              nonce: 0,
              input: JSON.stringify(messages[0] || {}),
              signature: '',
              code: txr.code || 0,
              log: txr.raw_log || '',
            };
          } catch (txErr) {
            console.error('获取交易详情失败:', txErr);
            return null;
          }
        });

        const txResults = await Promise.all(txPromises);
        transactions = txResults.filter((tx): tx is Transaction => tx !== null);
      }

      // 3. 计算总 gas 使用量
      const totalGasUsed = transactions.reduce((sum, tx) => sum + parseInt(tx.gasUsed || '0'), 0);

      // 4. 转换数据格式
      const blockInfo: BlockInfo = {
        blockHeight: blockData.block.header.height || '',
        blockHash: blockData.block_id.hash || '',
        parentHash: blockData.block.header.last_block_id?.hash || '',
        blockTime: blockData.block.header.time || '',
        gasLimit: '10000000', // Cosmos 默认值
        gasUsed: totalGasUsed.toString(),
        txCount: transactions.length.toString(),
        proposer: blockData.block.header.proposer_address || '',
        transactions,
      };

      setSelectedBlock(blockInfo);
    } catch (err: any) {
      console.error('获取区块信息失败:', err);

      // 根据错误类型提供更友好的错误提示
      if (err.response?.data?.message) {
        // 处理来自 Cosmos SDK 的错误消息
        const errorMsg = err.response.data.message;

        // 检查是否是区块高度不可用的错误
        if (errorMsg.includes('is not available') && errorMsg.includes('lowest height')) {
          const lowestHeightMatch = errorMsg.match(/lowest height is (\d+)/);
          if (lowestHeightMatch) {
            const lowestHeight = lowestHeightMatch[1];
            setError(`区块 ${height} 已被修剪，不再可用。最低可用区块: ${lowestHeight}，当前最新区块: ${currentBlock}`);
          } else {
            setError(`区块 ${height} 不可用。${errorMsg}`);
          }
        } else {
          setError(errorMsg);
        }
      } else if (err.response?.status === 500) {
        setError(`区块 ${height} 不存在或无法访问。当前链最新区块: ${currentBlock}`);
      } else if (err.response?.status === 404) {
        setError(`区块 ${height} 未找到`);
      } else if (err.code === 'ECONNREFUSED' || err.message?.includes('Network Error')) {
        setError('无法连接到区块链节点，请确保节点正在运行');
      } else {
        setError(err.message || '获取区块信息失败');
      }

      setSelectedBlock(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 初始化 - 获取最新区块
   */
  useEffect(() => {
    const init = async () => {
      const height = await fetchCurrentHeight();
      if (height > 0) {
        // 生成最近 20 个区块的列表
        const blocks = [];
        for (let i = height; i > Math.max(0, height - 20); i--) {
          blocks.push(i);
        }
        setRecentBlocks(blocks);

        // 默认加载最新区块
        await fetchBlockInfo(height);
      }
    };

    init();

    // 每 10 秒刷新一次
    const interval = setInterval(async () => {
      const height = await fetchCurrentHeight();
      if (height > currentBlock) {
        const blocks = [];
        for (let i = height; i > Math.max(0, height - 20); i--) {
          blocks.push(i);
        }
        setRecentBlocks(blocks);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  /**
   * 搜索区块
   */
  const handleSearch = async () => {
    const height = parseInt(searchHeight);
    if (isNaN(height) || height < 0) {
      setError('请输入有效的区块高度');
      return;
    }

    if (height > currentBlock) {
      setError(`区块高度不能超过当前高度 ${currentBlock}`);
      return;
    }

    await fetchBlockInfo(height);
  };

  /**
   * 格式化地址（显示前后各 6 位）
   */
  const formatAddress = (addr: string) => {
    if (!addr || addr.length < 12) return addr;
    return `${addr.slice(0, 10)}...${addr.slice(-6)}`;
  };

  /**
   * 格式化哈希（显示前后各 8 位）
   */
  const formatHash = (hash: string) => {
    if (!hash || hash.length < 16) return hash;
    return `${hash.slice(0, 12)}...${hash.slice(-8)}`;
  };

  /**
   * 格式化 ZETH 金额
   */
  const formatZETH = (uzeth: string) => {
    const amount = parseInt(uzeth) / 1000000;
    return amount.toFixed(6) + ' ZETH';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">🔍 区块浏览器</h1>
          <p className="mt-2 text-gray-600">
            浏览区块链数据，查看区块和交易详情
          </p>
        </div>

        {/* 当前区块高度 */}
        <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>当前区块高度:</strong> {currentBlock}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            💡 提示: 由于区块修剪策略，仅保留最近约 200 个区块。如需查询历史区块，请使用归档节点。
          </p>
        </div>

        {/* 搜索框 */}
        <div className="mb-6 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">搜索区块</h2>
          <div className="flex gap-4">
            <input
              type="number"
              value={searchHeight}
              onChange={(e) => setSearchHeight(e.target.value)}
              placeholder="输入区块高度..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {loading ? '搜索中...' : '搜索'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：最近区块列表 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                最近区块
              </h2>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {recentBlocks.map((height) => (
                  <button
                    key={height}
                    onClick={() => fetchBlockInfo(height)}
                    className={`w-full text-left px-4 py-3 rounded-md transition ${
                      selectedBlock?.blockHeight === height.toString()
                        ? 'bg-blue-100 border-2 border-blue-500'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-900">
                        #{height}
                      </span>
                      {height === currentBlock && (
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                          最新
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 右侧：区块详情 */}
          <div className="lg:col-span-2">
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">❌ {error}</p>
              </div>
            )}

            {loading && (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            )}

            {!loading && selectedBlock && (
              <div className="space-y-6">
                {/* 区块基本信息 */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">
                    区块 #{selectedBlock.blockHeight}
                  </h2>

                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-gray-600">区块高度:</span>
                      <span className="col-span-2 font-semibold text-blue-600">
                        {selectedBlock.blockHeight}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-gray-600">区块哈希:</span>
                      <span className="col-span-2 font-mono text-xs break-all">
                        {selectedBlock.blockHash}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-gray-600">父区块哈希:</span>
                      <span className="col-span-2 font-mono text-xs break-all">
                        {selectedBlock.parentHash}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-gray-600">出块时间:</span>
                      <span className="col-span-2">
                        {new Date(selectedBlock.blockTime).toLocaleString('zh-CN')}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-gray-600">Gas 限制:</span>
                      <span className="col-span-2 font-semibold">
                        {parseInt(selectedBlock.gasLimit).toLocaleString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-gray-600">Gas 使用:</span>
                      <span className="col-span-2 font-semibold text-green-600">
                        {parseInt(selectedBlock.gasUsed).toLocaleString()}
                        <span className="text-gray-500 ml-2">
                          (
                          {(
                            (parseInt(selectedBlock.gasUsed) /
                              parseInt(selectedBlock.gasLimit)) *
                            100
                          ).toFixed(2)}
                          %)
                        </span>
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-gray-600">交易数量:</span>
                      <span className="col-span-2 font-semibold">
                        {selectedBlock.txCount} 笔
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-gray-600">提议者:</span>
                      <span className="col-span-2 font-mono text-xs break-all">
                        {selectedBlock.proposer}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 交易列表 */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">
                    交易列表 ({selectedBlock.transactions.length})
                  </h2>

                  {selectedBlock.transactions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>该区块暂无交易</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedBlock.transactions.map((tx, index) => (
                        <div
                          key={tx.hash || index}
                          className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
                        >
                          <div
                            className="flex justify-between items-center cursor-pointer"
                            onClick={() =>
                              setExpandedTx(expandedTx === tx.hash ? null : tx.hash)
                            }
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                                  #{index + 1}
                                </span>
                                <span className="font-mono text-xs text-blue-600">
                                  {formatHash(tx.hash)}
                                </span>
                                {tx.code === 0 ? (
                                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                                    成功
                                  </span>
                                ) : (
                                  <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">
                                    失败
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-gray-600">From:</span>
                                <span className="font-mono text-xs">
                                  {formatAddress(tx.from)}
                                </span>
                                <span className="text-gray-400">→</span>
                                <span className="text-gray-600">To:</span>
                                <span className="font-mono text-xs">
                                  {formatAddress(tx.to)}
                                </span>
                              </div>

                              <div className="mt-2 text-sm">
                                <span className="text-gray-600">金额: </span>
                                <span className="font-semibold text-green-600">
                                  {tx.denom === 'uzeth'
                                    ? formatZETH(tx.value)
                                    : `${tx.value} ${tx.denom}`}
                                </span>
                                <span className="text-gray-600 ml-4">
                                  Gas: {parseInt(tx.gasUsed).toLocaleString()}
                                </span>
                              </div>
                            </div>

                            <button className="text-gray-400 hover:text-gray-600">
                              {expandedTx === tx.hash ? '▼' : '▶'}
                            </button>
                          </div>

                          {/* 展开的交易详情 */}
                          {expandedTx === tx.hash && (
                            <div className="mt-4 pt-4 border-t border-gray-200 space-y-2 text-sm">
                              <div className="grid grid-cols-4 gap-2">
                                <span className="text-gray-600">交易哈希:</span>
                                <span className="col-span-3 font-mono text-xs break-all">
                                  {tx.hash}
                                </span>
                              </div>

                              <div className="grid grid-cols-4 gap-2">
                                <span className="text-gray-600">发送者:</span>
                                <span className="col-span-3 font-mono text-xs break-all">
                                  {tx.from}
                                </span>
                              </div>

                              <div className="grid grid-cols-4 gap-2">
                                <span className="text-gray-600">接收者:</span>
                                <span className="col-span-3 font-mono text-xs break-all">
                                  {tx.to}
                                </span>
                              </div>

                              <div className="grid grid-cols-4 gap-2">
                                <span className="text-gray-600">金额:</span>
                                <span className="col-span-3 font-semibold">
                                  {tx.value} {tx.denom}
                                </span>
                              </div>

                              <div className="grid grid-cols-4 gap-2">
                                <span className="text-gray-600">Gas 价格:</span>
                                <span className="col-span-3">{tx.gasPrice}</span>
                              </div>

                              <div className="grid grid-cols-4 gap-2">
                                <span className="text-gray-600">Gas 限制:</span>
                                <span className="col-span-3">
                                  {parseInt(tx.gasLimit).toLocaleString()}
                                </span>
                              </div>

                              <div className="grid grid-cols-4 gap-2">
                                <span className="text-gray-600">Gas 使用:</span>
                                <span className="col-span-3 text-green-600 font-semibold">
                                  {parseInt(tx.gasUsed).toLocaleString()}
                                </span>
                              </div>

                              <div className="grid grid-cols-4 gap-2">
                                <span className="text-gray-600">Nonce:</span>
                                <span className="col-span-3">{tx.nonce}</span>
                              </div>

                              {tx.input && (
                                <div className="grid grid-cols-4 gap-2">
                                  <span className="text-gray-600">Input:</span>
                                  <span className="col-span-3 font-mono text-xs break-all">
                                    {tx.input}
                                  </span>
                                </div>
                              )}

                              {tx.signature && (
                                <div className="grid grid-cols-4 gap-2">
                                  <span className="text-gray-600">签名:</span>
                                  <span className="col-span-3 font-mono text-xs break-all">
                                    {tx.signature}
                                  </span>
                                </div>
                              )}

                              <div className="grid grid-cols-4 gap-2">
                                <span className="text-gray-600">状态:</span>
                                <span className="col-span-3">
                                  {tx.code === 0 ? (
                                    <span className="text-green-600">✓ {tx.log}</span>
                                  ) : (
                                    <span className="text-red-600">✗ {tx.log}</span>
                                  )}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockExplorer;
