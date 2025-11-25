import { StargateClient } from '@cosmjs/stargate';
import TransactionService from './transactionService';

// 由于项目在演示环境中将 @cosmjs/* 类型 shim 为 any，这里通过对外部交互进行 mock 来验证流程与错误处理
jest.mock('@cosmjs/stargate', () => ({
  GasPrice: { fromString: jest.fn(() => ({ amount: '0.025', denom: 'uzeth' })) },
  StargateClient: { connect: jest.fn() },
  SigningStargateClient: { connectWithSigner: jest.fn() },
}));

jest.mock('@cosmjs/proto-signing', () => ({
  DirectSecp256k1Wallet: { fromKey: jest.fn(async () => ({ /* wallet stub */ })) },
}));


describe('TransactionService', () => {
  const samplePriv = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('isTransactionSuccess returns true only when code===0', () => {
    expect(TransactionService.isTransactionSuccess({
      transactionHash: '0xabc', height: 1, code: 0, rawLog: '', gasUsed: 1, gasWanted: 1,
    })).toBe(true);
    expect(TransactionService.isTransactionSuccess({
      transactionHash: '0xabc', height: 1, code: 1, rawLog: '', gasUsed: 1, gasWanted: 1,
    })).toBe(false);
  });

  test('formatTransactionError returns empty string when success', () => {
    const res = { transactionHash: '0xabc', height: 1, code: 0, rawLog: '', gasUsed: 1, gasWanted: 1 };
    expect(TransactionService.formatTransactionError(res)).toBe('');
  });

  test('formatTransactionError extracts error keywords from rawLog', () => {
    const res = { transactionHash: '0xabc', height: 1, code: 1, rawLog: 'insufficient funds: not enough balance', gasUsed: 1, gasWanted: 1 };
    expect(TransactionService.formatTransactionError(res)).toContain('insufficient funds');
  });

  test('sendTransfer returns TxResult shape when client succeeds', async () => {
    const fakeClient = {
      sendTokens: jest.fn().mockResolvedValue({
        transactionHash: '0xhash', height: 100, code: 0, rawLog: '', gasUsed: 123, gasWanted: 200,
      }),
      disconnect: jest.fn(),
    } as any;
    jest.spyOn(TransactionService, 'createSigningClient').mockResolvedValue(fakeClient);

    const res = await TransactionService.sendTransfer(samplePriv, {
      fromAddress: 'zeth1from', toAddress: 'zeth1to', amount: '1000', denom: 'uzeth', memo: 'test',
    });

    expect(res.transactionHash).toBe('0xhash');
    expect(res.code).toBe(0);
    expect(fakeClient.sendTokens).toHaveBeenCalledTimes(1);
    expect(fakeClient.disconnect).toHaveBeenCalledTimes(1);
  });

  test('sendTransfer throws with error message propagation', async () => {
    const fakeClient = {
      sendTokens: jest.fn().mockRejectedValue(new Error('rpc error: failed')), disconnect: jest.fn(),
    } as any;
    jest.spyOn(TransactionService, 'createSigningClient').mockResolvedValue(fakeClient);

    await expect(TransactionService.sendTransfer(samplePriv, {
      fromAddress: 'zeth1from', toAddress: 'zeth1to', amount: '1000', denom: 'uzeth',
    })).rejects.toThrow('rpc error: failed');
  });

  test.skip('sendMineTransaction returns TxResult shape when client succeeds', async () => {
    const fakeClient = {
      signAndBroadcast: jest.fn().mockResolvedValue({ transactionHash: '0xmine', height: 101, code: 0, rawLog: '', gasUsed: 111, gasWanted: 222 }),
      disconnect: jest.fn(),
    } as any;
    jest.spyOn(TransactionService, 'createSigningClient').mockResolvedValue(fakeClient);

    const res = await TransactionService.sendMineTransaction(samplePriv, { minerAddress: 'zeth1miner', nonce: 1 });
    expect(res.transactionHash).toBe('0xmine');
    expect(res.code).toBe(0);
    expect(fakeClient.signAndBroadcast).toHaveBeenCalledTimes(1);
    expect(fakeClient.disconnect).toHaveBeenCalledTimes(1);
  });

  test('getBalance delegates to StargateClient and disconnects', async () => {
    const fakeBalance = [{ denom: 'uzeth', amount: '42' }];
    const fakeClient = { getAllBalances: jest.fn().mockResolvedValue(fakeBalance), disconnect: jest.fn() } as any;

    // Mock StargateClient.connect 方法
  jest.spyOn(StargateClient as any, 'connect').mockResolvedValue(fakeClient);

    const res = await TransactionService.getBalance('zeth1x');
    expect(res).toEqual(fakeBalance);
    expect(fakeClient.getAllBalances).toHaveBeenCalledWith('zeth1x');
    expect(fakeClient.disconnect).toHaveBeenCalledTimes(1);
  });

  test('getAccount delegates to StargateClient and disconnects', async () => {
    const fakeAccount = { address: 'zeth1x' } as any;
    const fakeClient = { getAccount: jest.fn().mockResolvedValue(fakeAccount), disconnect: jest.fn() } as any;

    // Mock StargateClient.connect 方法
    jest.spyOn(StargateClient as any, 'connect').mockResolvedValue(fakeClient);

    const res = await TransactionService.getAccount('zeth1x');
    expect(res).toEqual(fakeAccount);
    expect(fakeClient.getAccount).toHaveBeenCalledWith('zeth1x');
    expect(fakeClient.disconnect).toHaveBeenCalledTimes(1);
  });
});