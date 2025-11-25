/**
 * 转账组件
 * 支持选择发送者、输入接收者、金额、代币类型等
 */

import React, { useState, useEffect } from 'react';
import AccountDB from '../services/accountDB';
import TransactionService, { TxResult } from '../services/transactionService';
import WalletService from '../services/walletService';
import { Account } from '../types/account';
import { getBalance, formatZETH, zethToUzeth, getNodeStatus } from '../services/api';

type TokenType = 'uzeth' | 'stake';

const Transfer: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [receiverAddress, setReceiverAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [tokenType, setTokenType] = useState<TokenType>('uzeth');
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [txResult, setTxResult] = useState<TxResult | null>(null);
  const [balance, setBalance] = useState({ uzeth: '0', stake: '0' });
  const [searchKeyword, setSearchKeyword] = useState('');
  const [nodeOnline, setNodeOnline] = useState<boolean | null>(null);


  /**
   * 选择发送账户（优化：允许离线查看账户）
   */
  const handleSelectAccount = React.useCallback(async (account: Account) => {
    setSelectedAccount(account);
    setError('');

    // 尝试查询余额（如果节点在线）
    try {
      const balances = await getBalance(account.address);
      const uzethBalance = balances.find((b: any) => b.denom === 'uzeth')?.amount || '0';
      const stakeBalance = balances.find((b: any) => b.denom === 'stake')?.amount || '0';

      setBalance({
        uzeth: uzethBalance,
        stake: stakeBalance,
      });
    } catch (err) {
      console.log('节点离线，无法查询余额');
      // 节点离线时显示默认值，但不阻止选择账户
      setBalance({ uzeth: '未知', stake: '未知' });
    }
  }, []);

  /**
   * 加载账户列表
   */
  const loadAccounts = React.useCallback(async () => {
    try {
      const accountList = await AccountDB.getAllAccounts();
      setAccounts(accountList);

      // 默认选择第一个账户
      if (accountList.length > 0 && !selectedAccount) {
        handleSelectAccount(accountList[0]);
      }
    } catch (err) {
      console.error('加载账户失败:', err);
    }
  }, [selectedAccount, handleSelectAccount]);

  useEffect(() => {
    loadAccounts();
    checkNodeStatus();
    // 每 10 秒检查一次节点状态
    const interval = setInterval(checkNodeStatus, 10000);
    return () => clearInterval(interval);
  }, [loadAccounts]);

  /**
   * 检查区块链节点状态
   */
  const checkNodeStatus = async () => {
    try {
      await getNodeStatus();
      setNodeOnline(true);
    } catch (err) {
      setNodeOnline(false);
    }
  };

  /**
   * 验证表单
   */
  const validateForm = (): boolean => {
    if (!selectedAccount) {
      setError('请选择发送账户');
      return false;
    }

    // 检查账户是否有私钥
    if (!selectedAccount.privateKey || selectedAccount.privateKey.trim() === '') {
      setError('该账户没有私钥，无法进行转账。\n\n请使用「创建账户」功能导入此账户的私钥后再进行转账。\n\n💡 提示：可以在终端使用以下命令获取默认账户的私钥：\n/Users/ashy/go/bin/zethchaind keys export ' + selectedAccount.name + ' --unarmored-hex --unsafe -y --keyring-backend test');
      return false;
    }

    if (nodeOnline === false) {
      setError('区块链节点未运行，无法发送交易');
      return false;
    }

    const addr = receiverAddress.trim();

    if (!addr) {
      setError('请输入接收地址');
      return false;
    }

    if (!WalletService.isValidAddress(addr)) {
      setError('接收地址格式不正确');
      return false;
    }

    if (addr === selectedAccount.address) {
      setError('不能转账给自己');
      return false;
    }

    if (!amount || parseFloat(String(amount).trim()) <= 0) {
      setError('请输入有效的转账金额');
      return false;
    }

    // 检查余额（仅在余额已知时）
    const currentBalance = tokenType === 'uzeth' ? balance.uzeth : balance.stake;
    if (currentBalance !== '未知') {
      const amountInBase = zethToUzeth(parseFloat(String(amount).trim()));
      if (BigInt(amountInBase) > BigInt(currentBalance)) {
        setError('余额不足');
        return false;
      }
    }

    return true;
  };

  /**
   * 发送转账
   */
  const handleTransfer = async () => {
    if (!validateForm() || !selectedAccount) return;

    setLoading(true);
    setError('');
    setTxResult(null);

    try {
      // 保证 fromAddress 与私钥推导的一致
      const derivedAddress = await WalletService.deriveAddressFromPrivateKey(selectedAccount.privateKey);
      if (derivedAddress !== selectedAccount.address) {
        console.warn('账户地址与私钥推导不一致，已临时使用推导地址进行签名');
      }

      // 构造转账参数
      const transferParams = {
        fromAddress: derivedAddress,
        toAddress: receiverAddress.trim(),
        amount: String(zethToUzeth(parseFloat(String(amount).trim()))),
        denom: tokenType,
        memo: memo,
      };

      // 发送转账交易
      const result = await TransactionService.sendTransfer(
        selectedAccount.privateKey,
        transferParams
      );

      // 检查交易是否成功
      if (TransactionService.isTransactionSuccess(result)) {
        setTxResult(result);
        // 清空表单
        setReceiverAddress('');
        setAmount('');
        setMemo('');
        // 刷新余额
        await handleSelectAccount(selectedAccount);
        // 将相关账户标记为链上账户
        try {
          await AccountDB.markAccountOnChain(selectedAccount.address);
          const recv = await AccountDB.getAccountByAddress(receiverAddress.trim());
          if (recv) {
            await AccountDB.markAccountOnChain(recv.address);
          }
        } catch (e) {
          console.warn('标记链上账户时发生错误:', e);
        }
      } else {
        const errorMsg = TransactionService.formatTransactionError(result);
        setError(errorMsg || '交易失败');
      }
    } catch (err: any) {
      setError(err.message || '转账失败，请检查网络连接和账户余额');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 过滤账户
   */
  const filteredAccounts = searchKeyword
    ? accounts.filter(
      (acc) =>
        acc.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        acc.address.toLowerCase().includes(searchKeyword.toLowerCase())
    )
    : accounts;

  /**
   * 获取当前余额
   */
  const currentBalance = tokenType === 'uzeth' ? balance.uzeth : balance.stake;
  const currentBalanceFormatted = formatZETH(currentBalance);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">转账</h1>
          <p className="mt-2 text-gray-600">发送 ZETH 或 stake 代币到其他地址</p>
        </div>

        {/* 节点状态提示 */}
        {nodeOnline === false && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">区块链节点未运行</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>无法连接到区块链节点。转账功能需要区块链节点在线运行。</p>
                  <p className="mt-2 font-semibold">解决方法：</p>
                  <ol className="list-decimal ml-5 mt-1 space-y-1">
                    <li>打开终端，进入项目目录：<code className="bg-red-100 px-1 rounded">cd zethchain</code></li>
                    <li>启动区块链节点：<code className="bg-red-100 px-1 rounded">ignite chain serve</code></li>
                    <li>等待节点启动完成后，刷新此页面</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {nodeOnline === true && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-400 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">区块链节点在线 ✓</p>
              </div>
            </div>
          </div>
        )}

        {/* 交易成功提示 */}
        {txResult && TransactionService.isTransactionSuccess(txResult) && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-400 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-green-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">转账成功！</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>交易哈希: <span className="font-mono">{txResult.transactionHash}</span></p>
                  <p>区块高度: {txResult.height}</p>
                  <p>Gas 使用: {txResult.gasUsed} / {txResult.gasWanted}</p>
                  <p className="mt-2">该账户已被标记为链上账户 ✓</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 转账表单 */}
        <div className="bg-white shadow-lg rounded-lg p-6">
          {/* 发送者选择 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              发送者
            </label>

            {/* 搜索框 */}
            <input
              type="text"
              placeholder="搜索账户..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            {/* 账户下拉选择 */}
            <select
              value={selectedAccount?.address || ''}
              onChange={(e) => {
                const account = accounts.find((acc) => acc.address === e.target.value);
                if (account) handleSelectAccount(account);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            >
              <option value="">选择发送账户</option>
              {filteredAccounts.map((account) => (
                <option key={account.address} value={account.address}>
                  {account.name} - {account.address.slice(0, 20)}...
                </option>
              ))}
            </select>

            {/* 显示余额 */}
            {selectedAccount && (
              <div className="mt-3 p-3 bg-blue-50 rounded-md">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">ZETH 余额:</span>
                    <span className="ml-2 font-semibold text-blue-600">
                      {formatZETH(balance.uzeth)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">stake 余额:</span>
                    <span className="ml-2 font-semibold text-green-600">
                      {formatZETH(balance.stake)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 接收地址 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              接收地址
            </label>
            <input
              type="text"
              placeholder="zeth1..."
              value={receiverAddress}
              onChange={(e) => setReceiverAddress(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              disabled={loading}
            />
          </div>

          {/* 代币类型选择 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              代币类型
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="uzeth"
                  checked={tokenType === 'uzeth'}
                  onChange={(e) => setTokenType(e.target.value as TokenType)}
                  className="mr-2"
                  disabled={loading}
                />
                <span>ZETH</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="stake"
                  checked={tokenType === 'stake'}
                  onChange={(e) => setTokenType(e.target.value as TokenType)}
                  className="mr-2"
                  disabled={loading}
                />
                <span>stake</span>
              </label>
            </div>
          </div>

          {/* 转账金额 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              转账金额
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.000001"
                min="0"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 text-sm">
                {tokenType === 'uzeth' ? 'ZETH' : 'stake'}
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              可用余额: {currentBalanceFormatted}
            </p>
          </div>

          {/* 备注 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              备注 (可选)
            </label>
            <textarea
              placeholder="转账备注信息..."
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm break-words whitespace-pre-wrap">
              {error}
            </div>
          )}

          {/* Gas 费用提示 */}
          <div className="mb-6 p-3 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-600">
            <p>
              <strong>预估 Gas 费用:</strong> ~0.005 ZETH
            </p>
            <p className="mt-1 text-xs">
              实际 Gas 费用将在交易确认后显示
            </p>
          </div>

          {/* 发送按钮 */}
          <button
            onClick={handleTransfer}
            disabled={loading || !selectedAccount || nodeOnline === false}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                发送中...
              </span>
            ) : (
              '发送转账'
            )}
          </button>
        </div>

        {/* 转账说明 */}
        <div className="mt-6 bg-blue-50 border-l-4 border-blue-400 p-4 rounded-md">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">转账说明</h3>
              <div className="mt-2 text-sm text-blue-700 space-y-1">
                <p>• 转账需要使用私钥签名，请确保账户安全</p>
                <p>• 交易一旦发送无法撤回，请仔细核对接收地址</p>
                <p>• Gas 费用将从发送账户中扣除</p>
                <p>• 区块链必须正在运行才能发送交易</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Transfer;
