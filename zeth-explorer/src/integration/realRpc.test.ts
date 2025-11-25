/**
 * 真实 RPC 集成测试
 * - 从 .env 读取端点与链 ID
 * - 在提供测试账户时执行余额与转账验证
 */

import { StargateClient } from '@cosmjs/stargate';
import TransactionService from '../services/transactionService';

const RPC = process.env.REACT_APP_RPC_API || 'http://localhost:26657';
const CHAIN_ID = process.env.REACT_APP_CHAIN_ID || 'zethchain';
const DENOM = process.env.REACT_APP_DENOM || 'uzeth';

// 可选集成测试参数（需在 .env 中配置）
const TEST_ADDRESS = process.env.REACT_APP_TEST_ADDRESS;
const TEST_PRIVKEY_HEX = process.env.REACT_APP_TEST_PRIVKEY_HEX;
const TEST_FROM = process.env.REACT_APP_TEST_FROM;
const TEST_TO = process.env.REACT_APP_TEST_TO;
const TEST_AMOUNT = process.env.REACT_APP_TEST_AMOUNT || '1000';
const TEST_DENOM = process.env.REACT_APP_TEST_DENOM || DENOM;

// Jest 默认超时较短，真实链交互可能需要更长时间
jest.setTimeout(60000);

describe('Real RPC Integration', () => {
  test('connects to RPC and gets chain id & height', async () => {
    const client = await StargateClient.connect(RPC);
    const id = await client.getChainId();
    const height = await client.getHeight();
    client.disconnect();

    expect(id).toBe(CHAIN_ID);
    expect(height).toBeGreaterThan(0);
  });

  (TEST_ADDRESS ? test : test.skip)('queries balances for provided address', async () => {
    const balances = await TransactionService.getBalance(TEST_ADDRESS as string);
    expect(Array.isArray(balances)).toBe(true);
  });

  ((TEST_PRIVKEY_HEX && TEST_FROM && TEST_TO) ? test : test.skip)('sends transfer on real chain (requires .env privkey/from/to)', async () => {
    const result = await TransactionService.sendTransfer(TEST_PRIVKEY_HEX as string, {
      fromAddress: TEST_FROM as string,
      toAddress: TEST_TO as string,
      amount: TEST_AMOUNT,
      denom: TEST_DENOM,
      memo: 'Integration Test',
    });

    expect(result.transactionHash).toMatch(/^[A-Fa-f0-9]+$/);
    // 可进一步查询交易结果并断言成功
  });
});