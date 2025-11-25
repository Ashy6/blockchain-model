/**
 * 交易服务
 * 负责构造、签名和广播交易
 *
 * ⚠️ 教育目的：本实现用于学习和演示区块链交易流程
 */

import { StargateClient, SigningStargateClient, GasPrice, defaultRegistryTypes } from '@cosmjs/stargate';
import { DirectSecp256k1Wallet, Registry } from '@cosmjs/proto-signing';
import { fromHex } from './walletService';

/**
 * 区块链配置
 */
const RPC_ENDPOINT = 'http://localhost:26657';
const CHAIN_ID = 'zethchain';

/**
 * MsgMine Protobuf 编解码器
 */
const MsgMineCodec = {
  // 编码函数 - 将消息对象编码为 protobuf 字节
  encode: (message: any, writer = { uint32: () => writer, string: () => writer, finish: () => new Uint8Array(0) }) => {
    // 简单的 protobuf 编码实现
    const creator = message.creator || '';
    const miner = message.miner || '';

    // 手动构造 protobuf 消息
    // field 1 (creator): tag = (1 << 3) | 2 = 10 (0x0a)
    // field 2 (miner): tag = (2 << 3) | 2 = 18 (0x12)
    const creatorBytes = new TextEncoder().encode(creator);
    const minerBytes = new TextEncoder().encode(miner);

    const result = new Uint8Array(
      2 + creatorBytes.length + 2 + minerBytes.length
    );

    let offset = 0;
    // field 1: creator
    result[offset++] = 0x0a; // tag
    result[offset++] = creatorBytes.length; // length
    result.set(creatorBytes, offset);
    offset += creatorBytes.length;

    // field 2: miner
    result[offset++] = 0x12; // tag
    result[offset++] = minerBytes.length; // length
    result.set(minerBytes, offset);

    return result;
  },

  // 解码函数
  decode: (input: Uint8Array) => {
    return { creator: '', miner: '' };
  },

  // fromPartial 方法 - CosmJS 需要这个
  fromPartial: (object: any) => {
    return {
      creator: object.creator || '',
      miner: object.miner || '',
    };
  },

  // toJSON 方法
  toJSON: (message: any) => {
    return {
      creator: message.creator || '',
      miner: message.miner || '',
    };
  },

  // fromJSON 方法
  fromJSON: (object: any) => {
    return {
      creator: object.creator || '',
      miner: object.miner || '',
    };
  },

  // create 方法 - CosmJS Registry 需要这个方法来创建消息实例
  create: (base?: any) => {
    return {
      creator: base?.creator || '',
      miner: base?.miner || '',
    };
  },
};

/**
 * 创建自定义 Registry，注册 MsgMine 消息类型
 */
function createCustomRegistry() {
  const registry = new Registry(defaultRegistryTypes);

  // 注册 MsgMine 消息类型
  registry.register('/zethchain.mining.v1.MsgMine', MsgMineCodec);

  return registry;
}

/**
 * Gas 配置
 */
const GAS_PRICE = GasPrice.fromString('0.025uzeth');
const DEFAULT_GAS_LIMIT = '200000';

/**
 * 交易类型
 */
export interface TransferParams {
  fromAddress: string;
  toAddress: string;
  amount: string;
  denom: string;
  memo?: string;
}

export interface MineParams {
  minerAddress: string;
  nonce: number;
}

/**
 * 交易结果
 */
export interface TxResult {
  transactionHash: string;
  height: number;
  code: number;
  rawLog: string;
  gasUsed: number;
  gasWanted: number;
}

/**
 * 交易服务类
 */
export class TransactionService {
  /**
   * 创建签名客户端
   * @param privateKeyHex 私钥十六进制字符串
   */
  static async createSigningClient(
    privateKeyHex: string
  ): Promise<any> {
    try {
      // 验证私钥格式
      if (!privateKeyHex || privateKeyHex.length !== 64) {
        throw new Error('私钥格式错误：私钥必须是64位十六进制字符串');
      }

      // 1. 从十六进制私钥创建钱包
      console.log('正在从私钥创建钱包...');
      const privateKeyBytes = fromHex(privateKeyHex);

      if (privateKeyBytes.length !== 32) {
        throw new Error('私钥长度错误：应为32字节');
      }

      const wallet = await DirectSecp256k1Wallet.fromKey(privateKeyBytes, 'zeth');
      console.log('钱包创建成功');

      // 2. 创建自定义 Registry（注册 MsgMine 消息类型）
      const customRegistry = createCustomRegistry();

      // 3. 连接到 RPC 节点并创建签名客户端
      console.log(`正在连接到 RPC 节点: ${RPC_ENDPOINT}...`);
      const client = await SigningStargateClient.connectWithSigner(
        RPC_ENDPOINT,
        wallet,
        {
          gasPrice: GAS_PRICE,
          registry: customRegistry, // 使用自定义 Registry
        }
      );

      console.log('签名客户端创建成功');
      return client;
    } catch (error: any) {
      console.error('创建签名客户端失败:', error);

      // 提供更详细的错误信息
      if (error.message && error.message.includes('fetch')) {
        throw new Error(`无法连接到区块链节点 (${RPC_ENDPOINT})。\n请确保：\n1. 区块链节点正在运行 (ignite chain serve)\n2. RPC 端口 26657 可访问`);
      }

      if (error.message && error.message.includes('私钥')) {
        throw new Error(error.message);
      }

      if (error.message && error.message.includes('Invalid hex')) {
        throw new Error('私钥格式错误：包含无效字符');
      }

      throw new Error(`创建签名客户端失败: ${error.message || '未知错误'}`);
    }
  }

  /**
   * 发送转账交易
   */
  static async sendTransfer(
    privateKeyHex: string,
    params: TransferParams
  ): Promise<TxResult> {
    try {
      // 1. 创建签名客户端
      const client = await this.createSigningClient(privateKeyHex);

      // 2. 构造转账消息
      const amount = {
        denom: params.denom,
        amount: params.amount,
      };

      // 3. 发送交易
      const result = await client.sendTokens(
        params.fromAddress,
        params.toAddress,
        [amount],
        'auto', // 自动计算 gas
        params.memo || ''
      );

      // 4. 断开连接
      client.disconnect();

      // 5. 返回交易结果
      return {
        transactionHash: result.transactionHash,
        height: result.height,
        code: result.code,
        rawLog: result.rawLog || '',
        gasUsed: Number(result.gasUsed),
        gasWanted: Number(result.gasWanted),
      };
    } catch (error: any) {
      console.error('转账失败:', error);
      throw new Error(error.message || '转账失败，请检查余额和网络连接');
    }
  }

  /**
   * 发送挖矿交易
   */
  static async sendMineTransaction(
    privateKeyHex: string,
    params: MineParams
  ): Promise<TxResult> {
    try {
      // 1. 创建签名客户端
      const client = await this.createSigningClient(privateKeyHex);

      // 2. 构造挖矿消息
      const mineMsg = {
        typeUrl: '/zethchain.mining.v1.MsgMine',
        value: {
          creator: params.minerAddress,
          miner: params.minerAddress,
        },
      };

      // 3. 发送交易
      const result = await client.signAndBroadcast(
        params.minerAddress,
        [mineMsg],
        'auto',
        'PoS Block Production'
      );

      // 4. 断开连接
      client.disconnect();

      // 5. 返回交易结果
      return {
        transactionHash: result.transactionHash,
        height: result.height,
        code: result.code,
        rawLog: result.rawLog || '',
        gasUsed: Number(result.gasUsed),
        gasWanted: Number(result.gasWanted),
      };
    } catch (error: any) {
      console.error('挖矿失败:', error);
      // 检查是否是冷却期错误
      if (error.message && error.message.includes('cooldown')) {
        throw new Error('冷却时间未到，请稍后再试');
      }
      throw new Error(error.message || '挖矿失败，请检查网络连接');
    }
  }

  /**
   * 查询账户余额
   */
  static async getBalance(address: string): Promise<any> {
    try {
      const client = await StargateClient.connect(RPC_ENDPOINT);
      const balance = await client.getAllBalances(address);
      client.disconnect();
      return balance;
    } catch (error) {
      console.error('查询余额失败:', error);
      throw new Error('查询余额失败');
    }
  }

  /**
   * 查询账户信息
   */
  static async getAccount(address: string): Promise<any> {
    try {
      const client = await StargateClient.connect(RPC_ENDPOINT);
      const account = await client.getAccount(address);
      client.disconnect();
      return account;
    } catch (error) {
      console.error('查询账户信息失败:', error);
      throw new Error('查询账户信息失败');
    }
  }

  /**
   * 模拟交易（估算 Gas）
   */
  static async simulateTransfer(
    privateKeyHex: string,
    params: TransferParams
  ): Promise<number> {
    try {
      const client = await this.createSigningClient(privateKeyHex);

      // 参数校验与清洗，避免 undefined
      const fromAddress = (params.fromAddress || '').trim();
      const toAddress = (params.toAddress || '').trim();
      const amountStr = String(params.amount || '0');
      const denomStr = params.denom || 'uzeth';
      const memoStr = params.memo || '';

      if (!fromAddress || !toAddress) {
        throw new Error('模拟交易失败：发送者或接收者地址为空');
      }
      if (!amountStr || isNaN(Number(amountStr)) || Number(amountStr) <= 0) {
        throw new Error('模拟交易失败：金额无效');
      }

      const amount = {
        denom: denomStr,
        amount: amountStr,
      };

      // 使用 simulate 方法估算 gas
      const gasEstimation = await client.simulate(
        fromAddress,
        [
          {
            typeUrl: '/cosmos.bank.v1beta1.MsgSend',
            value: {
              fromAddress,
              toAddress,
              amount: [amount],
            },
          },
        ],
        memoStr
      );

      client.disconnect();

      // 返回估算的 gas 数量（乘以 1.3 作为安全边际）
      return Math.ceil(gasEstimation * 1.3);
    } catch (error) {
      console.error('模拟交易失败:', error);
      // 返回默认值
      return parseInt(DEFAULT_GAS_LIMIT);
    }
  }

  /**
   * 验证交易是否成功
   */
  static isTransactionSuccess(result: TxResult): boolean {
    return result.code === 0;
  }

  /**
   * 格式化交易错误
   */
  static formatTransactionError(result: TxResult): string {
    if (this.isTransactionSuccess(result)) {
      return '';
    }

    try {
      // 尝试从 rawLog 中提取错误信息
      const log = result.rawLog;
      if (log) {
        // 提取关键错误信息
        const match = log.match(/insufficient funds|invalid|failed/i);
        if (match) {
          return log;
        }
      }

      return `交易失败 (code: ${result.code})`;
    } catch {
      return `交易失败 (code: ${result.code})`;
    }
  }
}

export default TransactionService;
