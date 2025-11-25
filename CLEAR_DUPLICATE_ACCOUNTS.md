# 清理重复账户指南

## 问题说明

由于 React StrictMode 导致 useEffect 执行两次，造成默认账户被重复添加到 IndexedDB。

## 已修复的问题

在 [AccountManager.tsx](zeth-explorer/src/components/AccountManager.tsx:26-37) 中添加了 `useRef` 来防止重复初始化：

```typescript
// 使用 ref 确保初始化只执行一次
const hasInitialized = useRef(false);

const initializeAccountCount = async () => {
  // 防止重复初始化
  if (hasInitialized.current) {
    return;
  }
  hasInitialized.current = true;
  // ... 后续逻辑
};
```

## 清理重复账户的方法

### 方法 1：清空 IndexedDB（推荐）

这是最简单的方法，清空后前端会自动重新同步，且不会再重复。

1. **打开浏览器开发者工具**
   - 按 F12 或右键点击页面 → "检查"

2. **转到 Application 标签**
   - 在开发者工具顶部找到 "Application" 标签

3. **清空 IndexedDB**
   - 左侧展开 "IndexedDB"
   - 找到 "ZETHWallet"
   - 展开 "ZETHWallet" → 右键点击 "accounts"
   - 选择 "Clear"（清空）

4. **刷新页面**
   - 按 F5 刷新页面
   - 前端会自动从区块链获取三个默认账户
   - 这次不会重复添加（因为已修复代码）

5. **验证结果**
   - 应该看到正好 3 个账户：qa、qb、qc
   - 每个账户的余额正确显示

### 方法 2：手动删除重复账户

如果你有其他自己创建的账户不想丢失，可以手动删除重复的默认账户：

1. 在「我的账户」页面，找到重复的 qa、qb、qc 账户
2. 每个账户保留一个，其余的点击删除
3. 最终保留 3 个默认账户即可

### 方法 3：使用浏览器控制台清理（开发者选项）

在浏览器控制台（F12 → Console）执行以下代码：

```javascript
// 打开数据库
const request = indexedDB.open('ZETHWallet');

request.onsuccess = (event) => {
  const db = event.target.result;
  const transaction = db.transaction(['accounts'], 'readwrite');
  const objectStore = transaction.objectStore('accounts');
  
  // 获取所有账户
  const getAllRequest = objectStore.getAll();
  
  getAllRequest.onsuccess = () => {
    const accounts = getAllRequest.result;
    console.log('当前账户总数:', accounts.length);
    
    // 记录已见过的地址
    const seenAddresses = new Set();
    const toDelete = [];
    
    // 找出重复的账户
    accounts.forEach(account => {
      if (seenAddresses.has(account.address)) {
        toDelete.push(account.id);
        console.log('发现重复账户:', account.name, account.address);
      } else {
        seenAddresses.set(account.address);
      }
    });
    
    // 删除重复账户
    toDelete.forEach(id => {
      objectStore.delete(id);
      console.log('已删除重复账户 ID:', id);
    });
    
    console.log('清理完成！共删除', toDelete.length, '个重复账户');
  };
};
```

执行后刷新页面即可。

## 验证修复

清理完成后，验证是否正常：

1. **检查账户数量**
   - 「我的账户」应显示 (3) 或你的实际账户数量
   - 不应该有重复的 qa、qb、qc

2. **检查余额**
   - qa: 6,900 ZETH（验证者，100 ZETH 已质押）
   - qb: 100 ZETH（水龙头账户）
   - qc: 7,000 ZETH

3. **重启测试**
   - 刷新页面多次，账户不应再重复
   - 清空 IndexedDB 后刷新，应自动同步 3 个账户

## 为什么会发生重复？

**原因**：React 的 StrictMode（严格模式）会在开发环境下故意执行两次 useEffect，以帮助发现副作用问题。

**修复**：使用 `useRef` 确保初始化逻辑只执行一次，即使 useEffect 被调用两次。

## 后续不会再发生

✅ 已添加 `hasInitialized.current` 标志
✅ 在初始化开始时立即设置标志
✅ 第二次调用时会直接返回
✅ 添加了日志以便调试

新的代码在：
- [src/components/AccountManager.tsx](zeth-explorer/src/components/AccountManager.tsx:26-68)
