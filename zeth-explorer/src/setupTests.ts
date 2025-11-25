// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// 为 Dexie/IndexedDB 测试环境提供 polyfill，防止 Dexie 在 Jest 环境下挂起或抛错
import 'fake-indexeddb/auto';

// Polyfill for structuredClone (needed for fake-indexeddb in Node < 17)
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj));
}

// 为 @cosmjs 依赖提供 TextEncoder/TextDecoder polyfill（Jest/jsdom 环境下未定义）
import { TextEncoder, TextDecoder } from 'util';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).TextEncoder = TextEncoder;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).TextDecoder = TextDecoder;

// 全局 stub axios，避免 jest 解析 ESM 版本 axios 导致 SyntaxError
jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn() }));

// 由于 CRA 的 Jest 配置无法轻易自定义 transformIgnorePatterns，这里针对 @cosmjs 相关依赖提供最小可用 mock，避免 ESM 解析错误
jest.mock('@cosmjs/encoding', () => {
  const toHex = (bytes: Uint8Array): string => Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  const fromHex = (hex: string): Uint8Array => {
    const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
    const out = new Uint8Array(clean.length / 2);
    for (let i = 0; i < out.length; i++) {
      out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16) || 0;
    }
    return out;
  };
  const toBech32 = (prefix: string, data: Uint8Array): string => `${prefix}1${toHex(data).slice(0, 20) || 'mockaddress'}`;
  return { toBech32, fromHex, toHex };
});

jest.mock('@cosmjs/amino', () => ({
  rawSecp256k1PubkeyToRawAddress: (pubkey: Uint8Array) => new Uint8Array(20),
}));

jest.mock('@cosmjs/crypto', () => ({
  sha256: (data: Uint8Array | string) => new Uint8Array(32),
  Secp256k1: {
    makeKeypair: async (privkey: Uint8Array) => ({
      privkey,
      pubkey: new Uint8Array(33),
    }),
  },
}));

jest.mock('@cosmjs/stargate', () => ({
  SigningStargateClient: {
    connectWithSigner: async () => ({
      sendTokens: jest.fn(async () => ({
        transactionHash: 'MOCK_HASH',
        height: 1,
        code: 0,
        rawLog: 'OK',
        gasUsed: 12345,
        gasWanted: 12345,
      })),
      simulate: jest.fn(async () => 100000),
    }),
  },
  StargateClient: {
    connect: async () => ({
      getBalance: jest.fn(async () => ({ amount: '1000', denom: 'uzeth' })),
      getAccount: jest.fn(async () => ({ address: 'zeth1mockaddress' })),
    }),
  },
}));

jest.mock('@cosmjs/proto-signing', () => ({
  DirectSecp256k1Wallet: {
    fromKey: async (privKey: Uint8Array, prefix: string) => ({
      getAccounts: async () => [{ address: `${prefix}1mockaddress` }],
    }),
  },
}));

jest.mock('cosmjs-types/cosmos/tx/v1beta1/tx', () => ({
  TxRaw: {},
}));

// 保险起见，屏蔽 @scure/base 的 ESM 导出以避免解析错误（被部分依赖间接导入）
jest.mock('@scure/base', () => ({ utils: {} }));

// 如果项目内或依赖使用 @scure/bip39，也进行最小 mock，避免 ESM 解析
jest.mock('@scure/bip39', () => ({
  generateMnemonic: () => 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  mnemonicToSeed: async () => new Uint8Array(64),
}));

// Remove unused mocks to reflect pruned dependencies
jest.mock('@cosmjs/stargate', () => ({
  SigningStargateClient: {
    connectWithSigner: async () => ({
      sendTokens: jest.fn(async () => ({
        transactionHash: 'MOCK_HASH',
        height: 1,
        code: 0,
        rawLog: 'OK',
        gasUsed: 12345,
        gasWanted: 12345,
      })),
      simulate: jest.fn(async () => 100000),
    }),
  },
  StargateClient: {
    connect: async () => ({
      getBalance: jest.fn(async () => ({ amount: '1000', denom: 'uzeth' })),
      getAccount: jest.fn(async () => ({ address: 'zeth1mockaddress' })),
    }),
  },
}));
