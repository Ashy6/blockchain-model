/**
 * IndexedDB 账户存储服务
 * 使用 Dexie 封装 IndexedDB 操作
 *
 * ⚠️ 安全警告：
 * 本服务以明文形式存储私钥和助记词，仅用于教育和演示目的！
 * 生产环境应使用加密存储或硬件钱包。
 */

import Dexie, { Table } from 'dexie';
import { Account } from '../types/account';

/**
 * ZETH 钱包数据库类
 */
export class ZETHWalletDB extends Dexie {
  // 账户表
  accounts!: Table<Account, number>;

  constructor() {
    super('ZETHWallet');

    // 定义数据库模式 - 版本2添加私钥字段
    this.version(1).stores({
      accounts: '++id, name, address, createdAt'
    });

    // 版本2：添加privateKey字段
    this.version(2).stores({
      accounts: '++id, name, address, privateKey, createdAt'
    });

    // 版本3：添加 onChain 字段，用于标记链上账户
    this.version(3).stores({
      accounts: '++id, name, address, privateKey, createdAt, onChain'
    });
  }
}

// 创建数据库实例
export const db = new ZETHWalletDB();

/**
 * 账户数据库操作类
 */
export class AccountDB {
  /**
   * 添加新账户
   */
  static async addAccount(account: Omit<Account, 'id'>): Promise<number> {
    try {
      const id = await db.accounts.add({ ...(account as Account), onChain: (account as any).onChain ?? false } as Account);
      console.log('账户已保存到 IndexedDB:', id);
      return id;
    } catch (error) {
      console.error('保存账户失败:', error);
      throw new Error('保存账户到数据库失败');
    }
  }

  /**
   * 获取所有账户
   */
  static async getAllAccounts(): Promise<Account[]> {
    try {
      const accounts = await db.accounts.toArray();
      // 按创建时间降序排序
      return accounts.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.error('获取账户列表失败:', error);
      throw new Error('从数据库获取账户失败');
    }
  }

  /**
   * 根据 ID 获取账户
   */
  static async getAccountById(id: number): Promise<Account | undefined> {
    try {
      return await db.accounts.get(id);
    } catch (error) {
      console.error('获取账户失败:', error);
      throw new Error('从数据库获取账户失败');
    }
  }

  /**
   * 根据地址获取账户
   */
  static async getAccountByAddress(address: string): Promise<Account | undefined> {
    try {
      return await db.accounts.where('address').equals(address).first();
    } catch (error) {
      console.error('获取账户失败:', error);
      throw new Error('从数据库获取账户失败');
    }
  }

  /**
   * 搜索账户（按名称）
   */
  static async searchAccounts(keyword: string): Promise<Account[]> {
    try {
      if (!keyword.trim()) {
        return await this.getAllAccounts();
      }

      const accounts = await db.accounts
        .filter(account =>
          account.name.toLowerCase().includes(keyword.toLowerCase()) ||
          account.address.toLowerCase().includes(keyword.toLowerCase())
        )
        .toArray();

      return accounts.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.error('搜索账户失败:', error);
      throw new Error('搜索账户失败');
    }
  }

  /**
   * 更新账户信息（仅允许更新名称）
   */
  static async updateAccountName(id: number, newName: string): Promise<void> {
    try {
      await db.accounts.update(id, { name: newName });
      console.log('账户名称已更新:', id);
    } catch (error) {
      console.error('更新账户失败:', error);
      throw new Error('更新账户名称失败');
    }
  }

  /**
   * 删除账户
   */
  static async deleteAccount(id: number): Promise<void> {
    try {
      await db.accounts.delete(id);
      console.log('账户已删除:', id);
    } catch (error) {
      console.error('删除账户失败:', error);
      throw new Error('删除账户失败');
    }
  }

  /**
   * 检查地址是否已存在
   */
  static async isAddressExists(address: string): Promise<boolean> {
    try {
      const account = await db.accounts.where('address').equals(address).first();
      return !!account;
    } catch (error) {
      console.error('检查地址失败:', error);
      return false;
    }
  }

  /**
   * 检查账户名称是否已存在
   */
  static async isNameExists(name: string): Promise<boolean> {
    try {
      const account = await db.accounts.where('name').equals(name).first();
      return !!account;
    } catch (error) {
      console.error('检查名称失败:', error);
      return false;
    }
  }

  /**
   * 获取账户总数
   */
  static async getAccountCount(): Promise<number> {
    try {
      return await db.accounts.count();
    } catch (error) {
      console.error('获取账户数量失败:', error);
      return 0;
    }
  }

  /**
   * 清空所有账户（谨慎使用！）
   */
  static async clearAllAccounts(): Promise<void> {
    try {
      await db.accounts.clear();
      console.log('所有账户已清空');
    } catch (error) {
      console.error('清空账户失败:', error);
      throw new Error('清空账户失败');
    }
  }

  /**
   * 标记某账户为链上账户（地址匹配）
   */
  static async markAccountOnChain(address: string): Promise<void> {
    try {
      const acc = await db.accounts.where('address').equals(address).first();
      if (acc && !acc.onChain) {
        await db.accounts.update(acc.id!, { onChain: true });
        console.log('已标记为链上账户:', address);
      }
    } catch (error) {
      console.error('标记链上账户失败:', error);
    }
  }

  /**
   * 获取已标记为链上账户的本地账户
   */
  static async getOnChainAccounts(): Promise<Account[]> {
    try {
      // Dexie 的 TypeScript 类型对 boolean 索引支持较弱，改用 filter 以避免类型错误
      const accounts = await db.accounts
        .filter((a) => a.onChain === true)
        .toArray();
      return accounts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error('获取链上账户失败:', error);
      throw new Error('从数据库获取链上账户失败');
    }
  }
}

export default AccountDB;
