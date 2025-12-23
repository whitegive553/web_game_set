# 创建房间输入验证修复

## 问题

用户报告错误：
```
[GameLobby] Cannot create room: missing token or room name
```

## 根本原因

用户点击"创建"按钮时，**房间名称输入框为空**，导致验证失败。

原有的验证逻辑过于简单，没有给用户明确的反馈。

## 修复内容

### 1. 改进错误消息

**之前**：
```typescript
if (!token || !roomName.trim()) {
  console.warn('[GameLobby] Cannot create room: missing token or room name');
  return;
}
```

**之后**：
```typescript
if (!token) {
  console.error('[GameLobby] Cannot create room: no token (user not logged in?)');
  setError('请先登录');
  return;
}

if (!roomName.trim()) {
  console.warn('[GameLobby] Cannot create room: room name is empty');
  setError('请输入房间名称');
  return;
}
```

**改进**：
- 分别检查 token 和 roomName
- 显示中文错误提示给用户
- 更详细的日志信息

### 2. 在模态框中显示错误

添加了错误提示框：
```tsx
{error && (
  <div className="modal-error">
    {error}
  </div>
)}
```

**效果**：
- 错误直接显示在模态框内
- 红色背景，醒目
- 用户知道哪里出错了

### 3. 添加输入提示

```tsx
<label>房间名称 <span className="required">*</span></label>
<input
  type="text"
  value={roomName}
  onChange={e => setRoomName(e.target.value)}
  placeholder="输入房间名称"
  maxLength={30}
  autoFocus  // 自动聚焦
/>
{!roomName.trim() && (
  <small className="input-hint">请输入房间名称</small>
)}
```

**改进**：
- 红色星号标记必填项
- 自动聚焦到输入框
- 空值时显示灰色提示

### 4. 改进按钮禁用逻辑

```tsx
<button
  onClick={createRoom}
  className="btn-confirm"
  disabled={loading || !roomName.trim()}
  title={!roomName.trim() ? '请先输入房间名称' : '创建房间'}
>
  {loading ? '创建中...' : '创建'}
</button>
```

**改进**：
- 房间名称为空时禁用按钮
- 鼠标悬停显示提示信息
- 防止用户点击无效按钮

### 5. 改进模态框关闭处理

```typescript
const handleCloseCreateModal = () => {
  console.log('[GameLobby] Closing create room modal');
  setShowCreateModal(false);
  setRoomName(''); // 清除房间名称
  setError(null); // 清除错误
};
```

**改进**：
- 关闭模态框时清除输入
- 清除错误状态
- 下次打开是干净的状态

### 6. 新增 CSS 样式

```css
.modal-error {
  padding: 12px;
  margin-bottom: 15px;
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 6px;
  color: #c00;
  font-size: 0.9rem;
  animation: slideDown 0.3s ease;
}

.form-group label .required {
  color: #e74c3c;
  margin-left: 4px;
}

.input-hint {
  display: block;
  margin-top: 6px;
  color: #7f8c8d;
  font-size: 0.85rem;
  font-style: italic;
}
```

## 用户体验改进

### 之前的流程

1. 用户点击"创建房间" ✅
2. 模态框打开 ✅
3. 用户**直接点击"创建"**（没有输入房间名称）
4. **没有任何反应**（只有控制台有日志）❌
5. 用户困惑 ❌

### 现在的流程

1. 用户点击"创建房间" ✅
2. 模态框打开，光标自动在输入框 ✅
3. 输入框下方显示灰色提示："请输入房间名称" ✅
4. "创建"按钮是灰色禁用状态 ✅
5. 用户输入房间名称 ✅
6. "创建"按钮变为可用 ✅
7. 点击"创建"，成功创建房间 ✅

**如果用户不输入直接点"创建"（虽然按钮已禁用）**：
8. 模态框顶部显示红色错误："请输入房间名称" ✅
9. 用户知道需要输入 ✅

## 测试步骤

### 测试 1: 空房间名称

1. 打开游戏大厅
2. 点击"创建房间"
3. **不输入任何内容**
4. 观察"创建"按钮是灰色禁用状态 ✅
5. 鼠标悬停在按钮上，显示"请先输入房间名称" ✅

### 测试 2: 输入房间名称

1. 打开游戏大厅
2. 点击"创建房间"
3. 输入房间名称："测试房间"
4. 观察"创建"按钮变为可用（蓝色） ✅
5. 点击"创建"
6. 控制台输出：
   ```
   [GameLobby] Creating room: {
     gameId: 'avalon',
     name: '测试房间',
     maxPlayers: 6,
     hasToken: true
   }
   ```
7. 页面跳转到房间等待界面 ✅

### 测试 3: 关闭并重新打开

1. 打开创建房间模态框
2. 输入一些内容
3. 点击"取消"或点击模态框外部
4. 重新打开创建房间模态框
5. 确认输入框是空的 ✅
6. 确认没有错误提示 ✅

## 技术细节

### 调试日志增强

现在创建房间时会输出：
```javascript
console.log('[GameLobby] Creating room:', {
  gameId: selectedGame,
  name: roomName,
  maxPlayers,
  hasToken: !!token  // 新增：显示是否有 token
});
```

这帮助我们快速诊断是 token 问题还是房间名称问题。

### 分离的验证逻辑

```typescript
// 先检查 token
if (!token) {
  setError('请先登录');
  return;
}

// 再检查房间名称
if (!roomName.trim()) {
  setError('请输入房间名称');
  return;
}
```

这样错误消息更准确。

## 已修改的文件

1. **`packages/client/src/pages/GameLobby/GameLobby.tsx`**
   - 添加 `handleCloseCreateModal` 函数
   - 改进 `createRoom` 验证逻辑
   - 在模态框中添加错误显示
   - 添加输入提示和必填标记
   - 添加 `autoFocus` 和 `title` 属性

2. **`packages/client/src/pages/GameLobby/GameLobby.css`**
   - 添加 `.modal-error` 样式
   - 添加 `.required` 样式
   - 添加 `.input-hint` 样式

## 下一步

现在创建房间的输入验证已经完善。请测试：

1. **重启客户端**
   ```bash
   cd packages/client
   # Ctrl+C 停止
   npm run dev
   ```

2. **测试创建房间**
   - 打开游戏大厅
   - 点击"创建房间"
   - **输入房间名称**："我的第一个房间"
   - 点击"创建"
   - 应该成功跳转到房间等待界面

3. **查看控制台**
   - 应该看到：
     ```
     [GameLobby] Creating room: {
       gameId: 'avalon',
       name: '我的第一个房间',
       maxPlayers: 6,
       hasToken: true
     }
     ```
   - 然后看到 POST 请求成功

如果还有问题，请提供：
- 控制台完整日志
- Network 标签的请求详情
- 具体的操作步骤
