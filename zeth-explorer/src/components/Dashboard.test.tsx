import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from './Dashboard';
import { getLatestBlock, getChainStats, getTotalSupply } from '../services/api';

jest.mock('../services/api', () => {
  const actual = jest.requireActual('../services/api');
  return {
    ...actual,
    getLatestBlock: jest.fn(),
    getChainStats: jest.fn(),
    getTotalSupply: jest.fn(),
  };
});

describe('Dashboard component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('显示加载态', async () => {
    // 保持 pending，以便看到加载文案
    (getLatestBlock as jest.Mock).mockImplementation(() => new Promise(() => {}));
    (getChainStats as jest.Mock).mockImplementation(() => new Promise(() => {}));
    (getTotalSupply as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(<Dashboard />);

    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  test('错误态展示并包含错误信息', async () => {
    (getLatestBlock as jest.Mock).mockRejectedValue(new Error('Network Error'));
    (getChainStats as jest.Mock).mockResolvedValue({ blockHeight: '0', totalSupply: '0', validatorCount: '0' });
    (getTotalSupply as jest.Mock).mockResolvedValue({ denom: 'uzeth', amount: '0' });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('无法连接到区块链')).toBeInTheDocument();
    });

    expect(screen.getByText(/Network Error/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument();
  });

  test('成功渲染统计与最新区块（无交易）', async () => {
    const now = new Date().toISOString();

    (getLatestBlock as jest.Mock).mockResolvedValue({
      block_id: { hash: 'MOCK_HASH_ABC123' },
      block: {
        header: {
          height: '12345',
          time: now,
          proposer_address: 'MOCK_PROPOSER_ADDR',
        },
        data: { txs: [] },
      },
    });

    (getChainStats as jest.Mock).mockResolvedValue({
      blockHeight: '12345',
      totalSupply: '100000000000',
      validatorCount: '4',
    });

    (getTotalSupply as jest.Mock).mockResolvedValue({ denom: 'uzeth', amount: '100000000000' });

    render(<Dashboard />);

    // 页面标题
    expect(await screen.findByText('ZETH 区块链浏览器')).toBeInTheDocument();

    // 统计卡片：区块高度（千分位）、总供应量（格式化）、验证者数量
    expect(screen.getByText(/12,345/)).toBeInTheDocument();
    expect(screen.getByText('100000.000000 ZETH')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();

    // 最新区块信息
    expect(screen.getByText('最新区块')).toBeInTheDocument();
    expect(screen.getByText('#12345')).toBeInTheDocument();
    expect(screen.getByText('MOCK_HASH_ABC123')).toBeInTheDocument();

    // 无交易提示
    expect(screen.getByText('此区块暂无交易')).toBeInTheDocument();
  });
});