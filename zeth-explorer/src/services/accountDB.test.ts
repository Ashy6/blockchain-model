// 设置 IndexedDB polyfill 用于测试环境
import 'fake-indexeddb/auto';
import AccountDB, { db } from './accountDB';
import { Account } from '../types/account';

// 使用 fake-indexeddb 模拟 IndexedDB 环境

describe('AccountDB basic operations', () => {
  const sampleAccount: Omit<Account, 'id'> = {
    name: 'test-account',
    address: 'zeth1testaddressxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    privateKey: 'abcdef0123456789',
    createdAt: new Date(),
  };

  beforeAll(async () => {
    // 确保数据库已打开
    await db.open();
  });

  beforeEach(async () => {
    // 清空数据库
    try {
      await AccountDB.clearAllAccounts();
    } catch (error) {
      // 如果 IndexedDB 不可用，跳过测试
      console.warn('IndexedDB not available in test environment');
    }
  });

  test('add/get/count flows', async () => {
    const id = await AccountDB.addAccount(sampleAccount);
    expect(typeof id).toBe('number');

    const count = await AccountDB.getAccountCount();
    expect(count).toBe(1);

    const all = await AccountDB.getAllAccounts();
    expect(all.length).toBe(1);
    expect(all[0].name).toBe('test-account');

    const byAddr = await AccountDB.getAccountByAddress(sampleAccount.address);
    expect(byAddr?.name).toBe('test-account');

    const existsName = await AccountDB.isNameExists(sampleAccount.name);
    expect(existsName).toBe(true);

    const existsAddr = await AccountDB.isAddressExists(sampleAccount.address);
    expect(existsAddr).toBe(true);

    // 更新名称
    await AccountDB.updateAccountName(all[0].id!, 'renamed');
    const afterUpdate = await AccountDB.getAccountById(all[0].id!);
    expect(afterUpdate?.name).toBe('renamed');

    // 删除
    await AccountDB.deleteAccount(all[0].id!);
    const afterDeleteCount = await AccountDB.getAccountCount();
    expect(afterDeleteCount).toBe(0);
  });
});