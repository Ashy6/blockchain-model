import WalletService from './walletService';

describe('walletService.createAccount (简化版)', () => {
  test('生成账户对象，包含名称、地址和创建时间', async () => {
    const accountName = 'qa';
    const account = await WalletService.createAccount(accountName);

    expect(account.name).toBe(accountName);
    expect(typeof account.address).toBe('string');
    expect(account.address.startsWith('zeth')).toBe(true);
    expect(account.address.length).toBeGreaterThan(4);
    expect(account.createdAt instanceof Date).toBe(true);

    expect(WalletService.isValidAddress(account.address)).toBe(true);
  });

  test('isValidAddress: 非 zeth 前缀或长度不符合返回 false', () => {
    expect(WalletService.isValidAddress('cosmos1xxxx')).toBe(false);
    expect(WalletService.isValidAddress('zeth')).toBe(false);
    expect(WalletService.isValidAddress('zeth1' + 'x'.repeat(100))).toBe(false);
    expect(WalletService.isValidAddress('zeth1x')).toBe(true);
  });
});