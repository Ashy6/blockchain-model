/**
 * 账户类型定义
 * 用于 IndexedDB 存储和账户管理
 */

/**
 * 账户接口
 */
export interface Account {
  id?: number;           // 自增 ID (IndexedDB)
  name: string;          // 账户别名/名称
  address: string;       // Cosmos 地址 (zeth 前缀)
  privateKey: string;    // 私钥 (十六进制字符串) - 仅用于教育目的
  createdAt: Date;       // 创建时间
  onChain?: boolean;     // 是否已成为链上账户（发生过链上交易/有链上余额）
}

/**
 * 账户余额信息
 */
export interface AccountBalance {
  address: string;
  balances: CoinBalance[];
}

/**
 * 代币余额
 */
export interface CoinBalance {
  denom: string;         // 代币单位 (uzeth, stake)
  amount: string;        // 余额数量
}

/**
 * 创建账户表单数据
 */
export interface CreateAccountForm {
  name: string;
}

/**
 * 账户与余额组合
 */
export interface AccountWithBalance extends Account {
  zethBalance: string;   // ZETH 余额
  stakeBalance: string;  // stake 余额
}
