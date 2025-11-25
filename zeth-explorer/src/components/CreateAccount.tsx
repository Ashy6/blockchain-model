/**
 * 创建账户组件
 * 用于生成新的区块链账户（助记词、私钥、地址）
 */

import React, { useState } from 'react';
import WalletService from '../services/walletService';
import AccountDB from '../services/accountDB';
import { Account } from '../types/account';

interface CreateAccountProps {
  onAccountCreated?: () => void;
  onCancel?: () => void;
}

const CreateAccount: React.FC<CreateAccountProps> = ({
  onAccountCreated,
  onCancel,
}) => {
  const [mode, setMode] = useState<'create' | 'import'>('create');
  const [step, setStep] = useState<'input' | 'generated' | 'saved'>('input');
  const [accountName, setAccountName] = useState('');
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [generatedAccount, setGeneratedAccount] = useState<
    Omit<Account, 'id'> | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /**
   * 生成新账户
   */
  const handleGenerate = async () => {
    if (!accountName.trim()) {
      setError('请输入账户名称');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 检查账户名称是否已存在
      const exists = await AccountDB.isNameExists(accountName);
      if (exists) {
        setError('账户名称已存在，请使用其他名称');
        setLoading(false);
        return;
      }

      // 生成账户
      const account = await WalletService.createAccount(accountName);
      setGeneratedAccount(account);
      setStep('generated');
    } catch (err: any) {
      setError(err.message || '生成账户失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 导入私钥
   */
  const handleImport = async () => {
    if (!accountName.trim()) {
      setError('请输入账户名称');
      return;
    }

    if (!privateKeyInput.trim()) {
      setError('请输入私钥');
      return;
    }

    const privateKey = privateKeyInput.trim();

    // 验证私钥格式（64位十六进制字符串）
    if (!/^[0-9a-fA-F]{64}$/.test(privateKey)) {
      setError('私钥格式不正确，应为64位十六进制字符串');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 从私钥派生地址
      const address = await WalletService.deriveAddressFromPrivateKey(privateKey);

      // 检查地址是否已存在
      const existingAccount = await AccountDB.getAccountByAddress(address);

      if (existingAccount) {
        // 账户已存在，更新私钥
        if (existingAccount.privateKey && existingAccount.privateKey.trim() !== '') {
          setError('该账户已存在且已有私钥，无需重复导入');
          setLoading(false);
          return;
        }

        // 使用 Dexie 的 update 方法更新只读账户的私钥
        if (!existingAccount.id) {
          setError('账户数据异常，无法更新');
          setLoading(false);
          return;
        }

        // 导入私钥到 db
        const { db } = await import('../services/accountDB');
        await db.accounts.update(existingAccount.id, {
          privateKey: privateKey,
          name: accountName, // 可能更新名称
        });

        setStep('saved');
        if (onAccountCreated) {
          setTimeout(() => {
            onAccountCreated();
          }, 1500);
        }
      } else {
        // 账户不存在，创建新账户
        const account: Omit<Account, 'id'> = {
          name: accountName,
          address: address,
          privateKey: privateKey,
          createdAt: new Date(),
          onChain: false,
        };

        await AccountDB.addAccount(account);
        setStep('saved');

        if (onAccountCreated) {
          setTimeout(() => {
            onAccountCreated();
          }, 1500);
        }
      }
    } catch (err: any) {
      setError(err.message || '导入私钥失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 保存账户到 IndexedDB
   */
  const handleSave = async () => {
    if (!generatedAccount) return;

    setLoading(true);
    setError('');

    try {
      await AccountDB.addAccount(generatedAccount);
      setStep('saved');

      // 通知父组件
      if (onAccountCreated) {
        setTimeout(() => {
          onAccountCreated();
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || '保存账户失败');
    } finally {
      setLoading(false);
    }
  };


  /**
   * 重新开始
   */
  const handleReset = () => {
    setStep('input');
    setAccountName('');
    setPrivateKeyInput('');
    setGeneratedAccount(null);
    setError('');
    // 移除旧的复制状态重置
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* 模式切换 */}
      {step === 'input' && (
        <div className="mb-6 flex gap-4">
          <button
            onClick={() => setMode('create')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
              mode === 'create'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            🆕 创建新账户
          </button>
          <button
            onClick={() => setMode('import')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
              mode === 'import'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            📥 导入私钥
          </button>
        </div>
      )}

      {/* 安全警告 */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-yellow-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">安全警告</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                账户创建将生成<strong>私钥并保存到浏览器本地存储</strong>。私钥以明文形式存储，存在安全风险。
              </p>
              <p className="mt-1">
                这仅用于<strong>教育和演示目的</strong>，切勿用于生产环境或存储真实资产。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 步骤 1: 输入表单 */}
      {step === 'input' && mode === 'create' && (
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">创建新账户</h2>

          <div className="mb-6">
            <label
              htmlFor="accountName"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              账户名称
            </label>
            <input
              type="text"
              id="accountName"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="例如: 我的主账户"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={handleGenerate}
              disabled={loading || !accountName.trim()}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '生成中...' : '生成账户'}
            </button>

            {onCancel && (
              <button
                onClick={onCancel}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
            )}
          </div>
        </div>
      )}

      {/* 步骤 1: 导入私钥表单 */}
      {step === 'input' && mode === 'import' && (
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">📥 导入私钥</h2>

          <div className="mb-6">
            <label
              htmlFor="importAccountName"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              账户名称
            </label>
            <input
              type="text"
              id="importAccountName"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="例如: qa"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
          </div>

          <div className="mb-6">
            <label
              htmlFor="privateKey"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              私钥（64位十六进制字符串）
            </label>
            <textarea
              id="privateKey"
              value={privateKeyInput}
              onChange={(e) => setPrivateKeyInput(e.target.value)}
              placeholder="例如: a1b2c3d4e5f6..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              disabled={loading}
            />
            <p className="mt-2 text-xs text-gray-500">
              💡 提示：使用以下命令获取私钥：<br/>
              <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                /Users/ashy/go/bin/zethchaind keys export ACCOUNT_NAME --unarmored-hex --unsafe -y --keyring-backend test
              </code>
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={handleImport}
              disabled={loading || !accountName.trim() || !privateKeyInput.trim()}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '导入中...' : '导入账户'}
            </button>

            {onCancel && (
              <button
                onClick={onCancel}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
            )}
          </div>

          {/* 说明 */}
          <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
            <h4 className="text-sm font-medium text-blue-800 mb-2">导入说明</h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• 如果该地址已存在但没有私钥，会自动更新为可转账账户</li>
              <li>• 如果该地址不存在，会创建新账户</li>
              <li>• 私钥必须是64位十六进制字符串（32字节）</li>
              <li>• 导入后可以进行转账、挖矿等操作</li>
            </ul>
          </div>
        </div>
      )}

      {/* 步骤 2: 显示生成的账户信息 */}
      {step === 'generated' && generatedAccount && (
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            账户已生成 ✓
          </h2>

          {/* 账户名称 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              账户名称
            </label>
            <div className="p-3 bg-gray-50 rounded-md font-mono text-sm">
              {generatedAccount.name}
            </div>
          </div>

          {/* 地址 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              地址
            </label>
            <div className="p-3 bg-gray-50 rounded-md font-mono text-sm break-all">
              {generatedAccount.address}
            </div>
          </div>

          {/* 私钥警告 */}
          <div className="mb-6">
            <div className="p-4 bg-red-50 border-2 border-red-300 rounded-md">
              <p className="text-red-700 text-sm font-semibold">
                ⚠️ 安全警告：私钥已生成并将保存到浏览器本地存储
              </p>
              <p className="text-red-600 text-xs mt-2">
                请妥善保管私钥！这仅用于教育和演示目的，切勿用于生产环境或存储真实资产。
              </p>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
            >
              保存账户
            </button>
            <button
              onClick={handleReset}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              重新生成
            </button>
          </div>
        </div>
      )}

      {/* 步骤 3: 保存成功 */}
      {step === 'saved' && (
        <div className="bg-white shadow-lg rounded-lg p-6 text-center">
          <div className="mb-4">
            <svg
              className="mx-auto h-16 w-16 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            账户创建成功！
          </h2>
          <p className="text-gray-600 mb-6">
            账户已保存到本地数据库，正在返回账户列表...
          </p>
        </div>
      )}
    </div>
  );
};

export default CreateAccount;
