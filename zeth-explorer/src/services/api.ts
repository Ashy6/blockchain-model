/**
 * ZETH 区块链 API 服务
 *
 * 这个文件封装了与 ZETH 区块链交互的所有 API 调用
 * 包括查询区块、账户、交易、挖矿等功能
 */

import axios from 'axios';

// ==================== API 配置 ====================
// REST API 地址 - Cosmos SDK 提供的 REST 接口
const REST_API = process.env.REACT_APP_REST_API || (process.env.NODE_ENV === 'production' ? 'https://zethchain-proxy.zengjx1998.workers.dev/rest' : 'http://localhost:1317');

// RPC API 地址 - Tendermint RPC 接口
const RPC_API = process.env.REACT_APP_RPC_API || (process.env.NODE_ENV === 'production' ? 'https://zethchain-proxy.zengjx1998.workers.dev/rpc' : 'http://localhost:26657');

// 链 ID
const CHAIN_ID = process.env.REACT_APP_CHAIN_ID || 'zethchain';

// ==================== 类型定义 ====================

/**
 * 区块信息接口
 */
export interface BlockInfo {
  height: string;
  time: string;
  proposer: string;
  txCount: number;
}

/**
 * 链统计信息接口
 */
export interface ChainStats {
  blockHeight: string;
  totalSupply: string;
  validatorCount: string;
}

/**
 * 账户余额接口
 */
export interface Balance {
  denom: string;  // 代币单位,如 "uzeth"
  amount: string; // 数量
}

/**
 * 挖矿历史接口
 */
export interface MiningHistory {
  lastMineTime: string;  // Unix 时间戳
  totalMined: string;    // 总挖矿量(uzeth)
  mineCount: string;     // 挖矿成功次数
}

/**
 * Cosmos SDK 标准的区块响应
 */
export interface CosmosBlock {
  block_id: {
    hash: string;
  };
  block: {
    header: {
      height: string;
      time: string;
      proposer_address: string;
    };
    data: {
      txs: string[];
    };
  };
}

// ==================== 区块相关 API ====================

/**
 * 获取最新区块
 *
 * @returns {Promise<CosmosBlock>} 最新区块信息
 *
 * 使用示例:
 * ```typescript
 * const latestBlock = await getLatestBlock();
 * console.log('当前高度:', latestBlock.block.header.height);
 * ```
 */
export const getLatestBlock = async (): Promise<CosmosBlock> => {
  const response = await axios.get(`${REST_API}/cosmos/base/tendermint/v1beta1/blocks/latest`);
  return response.data;
};

/**
 * 获取指定高度的区块
 *
 * @param {number} height - 区块高度
 * @returns {Promise<CosmosBlock>} 区块信息
 *
 * 使用示例:
 * ```typescript
 * const block = await getBlockByHeight(100);
 * ```
 */
export const getBlockByHeight = async (height: number): Promise<CosmosBlock> => {
  const response = await axios.get(`${REST_API}/cosmos/base/tendermint/v1beta1/blocks/${height}`);
  return response.data;
};

/**
 * 获取区块详细信息(使用自定义 explorer 模块)
 *
 * @param {number} height - 区块高度,0表示当前区块
 * @returns {Promise<BlockInfo>} 区块信息
 */
export const getBlockInfo = async (height: number = 0): Promise<BlockInfo> => {
  try {
    const response = await axios.get(`${REST_API}/zethchain/explorer/v1/block_info`, {
      params: { height }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch block info:', error);
    throw error;
  }
};

// ==================== 链统计相关 API ====================

/**
 * 获取链统计信息(使用自定义 explorer 模块)
 *
 * @returns {Promise<ChainStats>} 链统计信息
 *
 * 包含信息:
 * - blockHeight: 当前区块高度
 * - totalSupply: ZETH 总供应量
 * - validatorCount: 验证者数量
 */
export const getChainStats = async (): Promise<ChainStats> => {
  try {
    const response = await axios.get(`${REST_API}/zethchain/explorer/v1/chain_stats`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch chain stats:', error);
    throw error;
  }
};

/**
 * 获取节点状态(通过 Tendermint RPC)
 *
 * @returns {Promise<any>} 节点状态信息
 */
export const getNodeStatus = async (): Promise<any> => {
  const response = await axios.get(`${RPC_API}/status`);
  return response.data;
};

// ==================== 账户相关 API ====================

/**
 * 查询账户余额
 *
 * @param {string} address - 账户地址
 * @returns {Promise<Balance[]>} 账户所有代币余额
 *
 * 使用示例:
 * ```typescript
 * const balances = await getBalance('zeth1abc...');
 * const zethBalance = balances.find(b => b.denom === 'uzeth');
 * console.log('ZETH 余额:', formatZETH(zethBalance.amount));
 * ```
 */
export const getBalance = async (address: string): Promise<Balance[]> => {
  const response = await axios.get(`${REST_API}/cosmos/bank/v1beta1/balances/${address}`);
  console.log('balances 数据', response)
  return response.data.balances;
};

/**
 * 查询 ZETH 总供应量
 *
 * @returns {Promise<Balance>} ZETH 总供应量
 */
export const getTotalSupply = async (): Promise<Balance> => {
  const response = await axios.get(`${REST_API}/cosmos/bank/v1beta1/supply/uzeth`);
  return response.data.amount;
};

// ==================== 交易相关 API ====================

/**
 * 通过哈希查询交易
 *
 * @param {string} hash - 交易哈希
 * @returns {Promise<any>} 交易详情
 */
export const getTx = async (hash: string): Promise<any> => {
  const response = await axios.get(`${REST_API}/cosmos/tx/v1beta1/txs/${hash}`);
  const data = response.data;
  // 合并返回：既包含 tx_response 的标准字段，也包含 tx 的消息体
  return {
    ...(data.tx_response || {}),
    tx: data.tx || undefined,
  };
};

/**
 * 查询地址的交易历史
 *
 * @param {string} address - 账户地址
 * @returns {Promise<any>} 交易列表
 */
export const getTxsByAddress = async (address: string): Promise<any[]> => {
  // 查询发送方是该地址的交易
  const sentTxsResp = await axios.get(`${REST_API}/cosmos/tx/v1beta1/txs`, {
    params: {
      'events': `message.sender='${address}'`,
      'pagination.limit': 100
    }
  });

  // 查询接收方是该地址的交易
  const recvTxsResp = await axios.get(`${REST_API}/cosmos/tx/v1beta1/txs`, {
    params: {
      'events': `transfer.recipient='${address}'`,
      'pagination.limit': 100
    }
  });

  // 将两个结果合并，并保留 tx_response 字段用于时间、状态等信息
  const mergeLists = (resp: any) => {
    const txs: any[] = resp?.data?.txs || [];
    const txResponses: any[] = resp?.data?.tx_responses || [];
    const list: any[] = [];
    for (let i = 0; i < Math.max(txs.length, txResponses.length); i++) {
      const tx = txs[i];
      const txr = txResponses[i];
      if (txr) {
        list.push({
          ...(txr || {}),
          tx: tx || undefined,
        });
      } else if (tx) {
        list.push({ tx });
      }
    }
    return list;
  };

  const allList = [...mergeLists(sentTxsResp), ...mergeLists(recvTxsResp)];

  // 根据 txhash 去重
  const map = new Map<string, any>();
  for (const item of allList) {
    const key = item.txhash || JSON.stringify(item.tx || item);
    if (!map.has(key)) {
      map.set(key, item);
    }
  }

  // 按时间倒序（若无时间则保持自然顺序）
  const result = Array.from(map.values());
  result.sort((a, b) => {
    const ta = new Date(a.timestamp || a.time || 0).getTime();
    const tb = new Date(b.timestamp || b.time || 0).getTime();
    return tb - ta;
  });

  return result;
};

// ==================== 挖矿相关 API ====================

/**
 * 查询挖矿历史(使用自定义 mining 模块)
 *
 * @param {string} address - 矿工地址
 * @returns {Promise<MiningHistory>} 挖矿历史数据
 *
 * 使用示例:
 * ```typescript
 * const history = await getMiningHistory('zeth1abc...');
 * console.log('已挖矿', history.mineCount, '次');
 * console.log('总获得', formatZETH(history.totalMined));
 * ```
 */
export const getMiningHistory = async (address: string): Promise<MiningHistory> => {
  try {
    const response = await axios.get(`${REST_API}/zethchain/mining/v1/mining_history`, {
      params: { address }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch mining history:', error);
    throw error;
  }
};

// ==================== 工具函数 ====================

/**
 * 将 uzeth 转换为 ZETH 显示
 *
 * @param {string | number} uzeth - uzeth 数量
 * @returns {string} 格式化的 ZETH 字符串
 *
 * 转换规则: 1 ZETH = 1,000,000 uzeth
 *
 * 使用示例:
 * ```typescript
 * formatZETH('10000000') // "10.000000 ZETH"
 * formatZETH(10000000)   // "10.000000 ZETH"
 * ```
 */
export const formatZETH = (uzeth: string | number): string => {
  const n = typeof uzeth === 'string' ? parseInt(uzeth, 10) : uzeth;
  if (n === null || n === undefined || Number.isNaN(n)) {
    return '未知';
  }
  const amount = n / 1000000;
  return `${amount.toFixed(6)} ZETH`;
};

/**
 * 将 ZETH 转换为 uzeth
 *
 * @param {number} zeth - ZETH 数量
 * @returns {number} uzeth 数量
 *
 * 使用示例:
 * ```typescript
 * zethToUzeth(10) // 10000000
 * ```
 */
export const zethToUzeth = (zeth: number): number => {
  return Math.floor(zeth * 1000000);
};

/**
 * 格式化时间戳
 *
 * @param {string} timestamp - ISO 时间戳或 Unix 时间戳
 * @returns {string} 格式化的时间字符串
 *
 * 使用示例:
 * ```typescript
 * formatTime('2024-11-19T10:30:00Z') // "2024/11/19 18:30:00"
 * formatTime('1700123456') // "2023/11/16 12:04:16"
 * ```
 */
export const formatTime = (timestamp: string | number): string => {
  if (typeof timestamp === 'string' && timestamp.includes('-')) {
    // ISO 格式
    return new Date(timestamp).toLocaleString('zh-CN');
  } else {
    // Unix 时间戳(秒)
    const ts = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;
    return new Date(ts * 1000).toLocaleString('zh-CN');
  }
};

/**
 * 缩短地址显示
 *
 * @param {string} address - 完整地址
 * @param {number} prefixLen - 前缀长度,默认 8
 * @param {number} suffixLen - 后缀长度,默认 6
 * @returns {string} 缩短的地址
 *
 * 使用示例:
 * ```typescript
 * shortenAddress('zeth1nqvdzthzfqnpwt9a5fvkphnxxaqkr6z90p9fuc')
 * // "zeth1nqv...p9fuc"
 * ```
 */
export const shortenAddress = (
  address: string,
  prefixLen: number = 8,
  suffixLen: number = 6
): string => {
  if (address.length <= prefixLen + suffixLen) {
    return address;
  }
  return `${address.substring(0, prefixLen)}...${address.substring(address.length - suffixLen)}`;
};

/**
 * 格式化大数字(添加千分位)
 *
 * @param {string | number} num - 数字
 * @returns {string} 格式化的数字字符串
 *
 * 使用示例:
 * ```typescript
 * formatNumber(1000000) // "1,000,000"
 * ```
 */
export const formatNumber = (num: string | number): string => {
  const n = typeof num === 'string' ? parseInt(num) : num;
  return n.toLocaleString('en-US');
};

// ==================== 导出配置 ====================
// ==================== Faucet 相关 API ====================
/**
 * 使用本地 Faucet 为地址充值
 * @param address 链上地址（zeth1...）
 * @param uzethAmount 默认 100ZETH -> 100000000uzeth
 */
export const faucetCredit = async (
  address: string,
  uzethAmount: string = '100000000uzeth'
): Promise<any> => {
  try {
    const faucetUrl = process.env.REACT_APP_FAUCET_API || (process.env.NODE_ENV === 'production' ? 'https://zethchain-proxy.zengjx1998.workers.dev/faucet' : 'http://localhost:4500');
    const response = await axios.post(faucetUrl, {
      address,
      coins: [uzethAmount]
    });
    return response.data;
  } catch (error: any) {
    console.error('Faucet 充值失败:', error);
    throw new Error(error.message || 'Faucet 充值失败');
  }
};

export const API_CONFIG = {
  REST_API,
  RPC_API,
  CHAIN_ID,
};
