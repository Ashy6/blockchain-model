import { formatZETH, zethToUzeth, formatTime, shortenAddress, formatNumber } from './api';

describe('utils in api.ts', () => {
  test('formatZETH converts uzeth to ZETH with 6 decimals', () => {
    expect(formatZETH('1000000')).toBe('1.000000 ZETH');
    expect(formatZETH(10000000)).toBe('10.000000 ZETH');
    expect(formatZETH('123456789')).toBe('123.456789 ZETH');
  });

  test('zethToUzeth converts ZETH to uzeth using floor', () => {
    expect(zethToUzeth(10)).toBe(10000000);
    expect(zethToUzeth(10.5)).toBe(10500000);
    expect(zethToUzeth(0.0000019)).toBe(1); // floor after multiply
  });

  test('formatTime handles ISO and Unix timestamps', () => {
    const iso = '2026-11-19T10:30:00Z';
    expect(formatTime(iso)).toBe(new Date(iso).toLocaleString('zh-CN'));

    const unixSecStr = '1700123456';
    expect(formatTime(unixSecStr)).toBe(new Date(1700123456 * 1000).toLocaleString('zh-CN'));

    const unixSecNum = 1700123456;
    expect(formatTime(unixSecNum)).toBe(new Date(1700123456 * 1000).toLocaleString('zh-CN'));
  });

  test('shortenAddress keeps prefix and suffix, inserts ellipsis', () => {
    const addr = 'zeth1nqvdzthzfqnpwt9a5fvkphnxxaqkr6z90p9fuc';
    // default prefixLen=8, suffixLen=6
    expect(shortenAddress(addr)).toBe('zeth1nqv...0p9fuc');
    expect(shortenAddress(addr, 4, 4)).toBe('zeth...9fuc');

    // short address should be unchanged
    const shortAddr = 'abc123';
    expect(shortenAddress(shortAddr)).toBe(shortAddr);
  });

  test('formatNumber adds thousands separators', () => {
    expect(formatNumber(1000000)).toBe('1,000,000');
    expect(formatNumber('123456789')).toBe('123,456,789');
  });
});

describe('API_CONFIG env behavior', () => {
  const originalEnv = process.env.REACT_APP_REST_API;

  afterAll(() => {
    (process.env as any).REACT_APP_REST_API = originalEnv;
  });

  test('REST_API falls back to default when env not set', async () => {
    delete (process.env as any).REACT_APP_REST_API;
    jest.resetModules();
    const mod = await import('./api');
    expect(mod.API_CONFIG.REST_API).toBe('http://localhost:1317');
  });

  test('REST_API reflects env when set before import', async () => {
    (process.env as any).REACT_APP_REST_API = 'http://custom:9999';
    jest.resetModules();
    const mod = await import('./api');
    expect(mod.API_CONFIG.REST_API).toBe('http://custom:9999');
  });
});