/**
 * 钱包服务
 * 负责生成私钥、地址，并提供地址校验
 *
 * ⚠️ 教育目的：本实现以明文存储私钥，仅用于学习和演示！
 * 生产环境应使用加密存储或硬件钱包。
 */
import { toBech32 } from '@cosmjs/encoding';
import { Secp256k1, sha256, ripemd160 } from '@cosmjs/crypto';
import { Account } from '../types/account';

/**
 * 地址前缀常量
 */
const ADDRESS_PREFIX = 'zeth';

/**
 * 生成指定长度的随机字节
 * 优先使用 Web Crypto；若不可用则使用 Math.random 退化实现（仅用于测试/演示）
 */
function getRandomBytes(length: number): Uint8Array {
  const out = new Uint8Array(length);
  if (typeof globalThis !== 'undefined' && (globalThis as any).crypto && (globalThis as any).crypto.getRandomValues) {
    (globalThis as any).crypto.getRandomValues(out);
  } else {
    for (let i = 0; i < length; i++) {
      out[i] = Math.floor(Math.random() * 256);
    }
  }
  return out;
}

/**
 * 将字节数组转换为十六进制字符串
 */
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 将十六进制字符串转换为字节数组
 */
export function fromHex(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * 钱包工具类
 */
export class WalletService {
  /**
   * 创建新账户（包含私钥、地址）
   */
  static async createAccount(name: string): Promise<Omit<Account, 'id'>> {
    try {
      // 1. 生成 32 字节随机私钥
      const privateKeyBytes = getRandomBytes(32);
      const privateKey = toHex(privateKeyBytes);

      // 2. 从私钥派生公钥
      const keypair = await Secp256k1.makeKeypair(privateKeyBytes);
      const pubkey = Secp256k1.compressPubkey(keypair.pubkey);

      // 3. 计算地址：RIPEMD160(SHA256(pubkey)) 的 20 字节
      const addressBytes = ripemd160(sha256(pubkey));
      const address = toBech32(ADDRESS_PREFIX, addressBytes);

      const account: Omit<Account, 'id'> = {
        name,
        address,
        privateKey,
        createdAt: new Date(),
        onChain: false,
      };

      console.log('账户创建成功:', address);
      return account;
    } catch (error) {
      console.error('创建账户失败:', error);
      throw new Error('创建账户失败，请重试');
    }
  }

  /**
   * 验证地址格式（基础校验）
   */
  static isValidAddress(address: string): boolean {
    try {
      if (!address.startsWith(ADDRESS_PREFIX)) return false;
      if (address.length < ADDRESS_PREFIX.length + 2) return false; // 至少前缀 + 内容
      if (address.length > 100) return false; // 过长不合法
      return true;
    } catch {
      return false;
    }
  }

  // /**
  //  * 初始化默认账户
  //  */
  // static async createDefaultAccounts(): Promise<Array<Omit<Account, 'id'>>> {
  //   const defaultNames = ['qa', 'qb', 'qc'];
  //   const accounts = await Promise.all(defaultNames.map((name) => this.createAccount(name)));
  //   console.log('默认账户创建完成:', accounts.length);
  //   return accounts;
  // }
  /**
   * 通过私钥推导地址（与 DirectSecp256k1Wallet 一致）
   */
  static async deriveAddressFromPrivateKey(privateKeyHex: string): Promise<string> {
    const privateKeyBytes = fromHex(privateKeyHex);
    const keypair = await Secp256k1.makeKeypair(privateKeyBytes);
    const pubkey = Secp256k1.compressPubkey(keypair.pubkey);
    const addressBytes = ripemd160(sha256(pubkey));
    return toBech32(ADDRESS_PREFIX, addressBytes);
  }
}

export default WalletService;
