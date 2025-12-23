# 认证 Token 问题修复

## 🐛 问题描述

用户报告错误：
```
[GameLobby] Cannot create room: no token (user not logged in?)
```

但用户实际上已经登录了。

## 🔍 根本原因

**AuthContext 没有暴露 `token` 属性**

### 问题分析

1. **GameLobby 组件期望的**：
   ```typescript
   const { token, user } = useAuth();
   ```

2. **AuthContext 实际提供的**：
   ```typescript
   interface AuthContextValue {
     user: User | null;
     // ❌ 没有 token
     isAuthenticated: boolean;
     isLoading: boolean;
     error: string | null;
     // ...
   }
   ```

3. **Token 实际存储位置**：
   - Token 存储在 `localStorage` 中（通过 `authApi.setToken()`）
   - 但没有通过 AuthContext 暴露给组件

### 导致的问题

- GameLobby 组件从 `useAuth()` 获取 `token` 时得到 `undefined`
- 验证 `if (!token)` 总是为真
- 所以报错 "no token (user not logged in?)"

## ✅ 修复方案

### 1. 在 AuthContext 接口中添加 `token` 属性

**文件**: `packages/client/src/store/AuthContext.tsx`

```typescript
interface AuthContextValue {
  user: User | null;
  token: string | null;  // ✅ 新增
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  // ...
}
```

### 2. 添加 token 状态管理

```typescript
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);  // ✅ 新增
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // ...
}
```

### 3. 在初始化时读取 token

```typescript
useEffect(() => {
  const checkAuth = async () => {
    const storedToken = authApi.getToken();

    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    console.log('[Auth] Found stored token, verifying...');
    setTokenState(storedToken);  // ✅ 设置 token 状态

    try {
      const response = await authApi.me();
      if (response.success && response.data) {
        setUser(response.data.user);
        console.log('[Auth] User authenticated:', response.data.user.username);
      } else {
        // Invalid token, clear it
        authApi.clearToken();
        setTokenState(null);  // ✅ 清除 token 状态
      }
    } catch (err) {
      console.error('[Auth] Failed to check authentication:', err);
      authApi.clearToken();
      setTokenState(null);  // ✅ 清除 token 状态
    } finally {
      setIsLoading(false);
    }
  };

  checkAuth();
}, []);
```

### 4. 在 login 时设置 token

```typescript
const login = useCallback(async (username: string, password: string): Promise<boolean> => {
  setIsLoading(true);
  setError(null);

  try {
    const response = await authApi.login(username, password);

    if (response.success && response.data) {
      setUser(response.data.user);
      setTokenState(response.data.token);  // ✅ 设置 token
      console.log('[Auth] Login successful:', response.data.user.username);
      console.log('[Auth] Token set:', !!response.data.token);
      return true;
    } else {
      setError(response.error || 'Login failed');
      return false;
    }
  } catch (err) {
    console.error('[Auth] Login error:', err);
    setError('Login failed');
    return false;
  } finally {
    setIsLoading(false);
  }
}, []);
```

### 5. 在 register 时设置 token

```typescript
const register = useCallback(async (username: string, password: string): Promise<boolean> => {
  // ... 类似 login
  if (response.success && response.data) {
    setUser(response.data.user);
    setTokenState(response.data.token);  // ✅ 设置 token
    console.log('[Auth] Registration successful:', response.data.user.username);
    console.log('[Auth] Token set:', !!response.data.token);
    return true;
  }
  // ...
}, []);
```

### 6. 在 logout 时清除 token

```typescript
const logout = useCallback(async (): Promise<void> => {
  setIsLoading(true);

  try {
    await authApi.logout();
  } finally {
    setUser(null);
    setTokenState(null);  // ✅ 清除 token
    console.log('[Auth] Logout successful, token cleared');
    setIsLoading(false);
  }
}, []);
```

### 7. 在 Context Value 中暴露 token

```typescript
const value: AuthContextValue = {
  user,
  token,  // ✅ 暴露给组件
  isAuthenticated: !!user,
  isLoading,
  error,
  login,
  register,
  logout,
  clearError
};
```

### 8. 增强 GameLobby 的调试日志

**文件**: `packages/client/src/pages/GameLobby/GameLobby.tsx`

```typescript
// Debug log
console.log('[GameLobby] Component rendered', {
  selectedGame,
  showCreateModal,
  loading,
  hasToken: !!token,          // ✅ 显示是否有 token
  tokenLength: token?.length, // ✅ 显示 token 长度
  user: user?.username        // ✅ 显示用户名
});
```

## 📊 数据流

### 登录流程

```
1. 用户输入账号密码
   ↓
2. authApi.login(username, password)
   ↓
3. 服务器返回 { user, token }
   ↓
4. authApi.setToken(token) → localStorage
   ↓
5. AuthContext.setUser(user)
   ↓
6. AuthContext.setTokenState(token)  ← ✅ 新增
   ↓
7. 组件可以通过 useAuth() 获取 token
```

### 刷新页面流程

```
1. AuthProvider 挂载
   ↓
2. useEffect checkAuth() 执行
   ↓
3. authApi.getToken() → 从 localStorage 读取
   ↓
4. setTokenState(storedToken)  ← ✅ 新增
   ↓
5. authApi.me() → 验证 token 有效性
   ↓
6. 如果有效：setUser(user)
   如果无效：clearToken() + setTokenState(null)
```

## 🧪 测试步骤

### 1. 重启客户端

```bash
cd packages/client
# Ctrl+C 停止
npm run dev
```

### 2. 打开浏览器控制台（F12）

### 3. 登录

使用任意账号登录，应该看到：

```
[Auth] Login successful: your_username
[Auth] Token set: true
```

### 4. 进入游戏大厅

点击"多人游戏大厅"，应该看到：

```
[GameLobby] Component rendered {
  selectedGame: 'avalon',
  showCreateModal: false,
  loading: false,
  hasToken: true,          ← ✅ 现在是 true！
  tokenLength: 142,        ← ✅ token 长度（约 140-200 字符）
  user: 'your_username'
}
```

### 5. 创建房间

输入房间名称，点击"创建"，应该看到：

```
[GameLobby] Creating room: {
  gameId: 'avalon',
  name: '测试房间',
  maxPlayers: 6,
  hasToken: true  ← ✅ 现在是 true！
}
```

然后应该成功跳转到房间等待界面。

### 6. 刷新页面测试

刷新页面（F5），应该看到：

```
[Auth] Found stored token, verifying...
[Auth] User authenticated: your_username
[GameLobby] Component rendered {
  hasToken: true,  ← ✅ 刷新后仍然有 token
  user: 'your_username'
}
```

## 🎯 预期结果

### 修复前

```
[GameLobby] Component rendered {
  hasToken: false,  ❌
  user: 'your_username'
}

[GameLobby] Creating room: { hasToken: false }  ❌
[GameLobby] Cannot create room: no token  ❌
```

### 修复后

```
[GameLobby] Component rendered {
  hasToken: true,  ✅
  tokenLength: 142,  ✅
  user: 'your_username'
}

[GameLobby] Creating room: { hasToken: true }  ✅
[发送请求] POST /api/lobby/rooms  ✅
[收到响应] 200  ✅
页面跳转到房间等待界面  ✅
```

## 📝 已修改的文件

1. **`packages/client/src/store/AuthContext.tsx`**
   - 添加 `token` 到接口定义
   - 添加 `token` 状态管理
   - 在所有相关函数中同步 token 状态
   - 在 Context Value 中暴露 token
   - 添加详细的调试日志

2. **`packages/client/src/pages/GameLobby/GameLobby.tsx`**
   - 增强调试日志，显示 token 状态

## 🔐 安全说明

### Token 存储

- Token 同时存储在：
  1. **localStorage** - 持久化，页面刷新后保留
  2. **React State** - 临时，仅在当前会话中使用

### 为什么需要两个存储？

1. **localStorage**：
   - 页面刷新后能恢复登录状态
   - 跨标签页共享登录状态

2. **React State**：
   - 方便组件访问（通过 useAuth）
   - 响应式更新（token 变化自动重新渲染）
   - 类型安全（TypeScript 检查）

### Token 同步

```typescript
// 初始化时
const storedToken = authApi.getToken();  // 从 localStorage 读取
setTokenState(storedToken);              // 同步到 State

// 登录时
authApi.setToken(token);                 // 写入 localStorage
setTokenState(token);                    // 同步到 State

// 登出时
authApi.clearToken();                    // 清除 localStorage
setTokenState(null);                     // 清除 State
```

## 💡 经验教训

### 1. Context 接口要完整

如果组件需要某个值，Context 必须提供它。不能只存储在 localStorage 而不暴露。

### 2. 添加调试日志

详细的日志帮助快速定位问题：
- `[Auth] Token set: true` - 确认 token 已设置
- `hasToken: true` - 确认组件获取到 token

### 3. 状态同步

多个存储位置（localStorage + State）需要保持同步：
- Login → 同时更新两处
- Logout → 同时清除两处
- Init → 从 localStorage 恢复到 State

## 📋 总结

修复后，AuthContext 现在：

1. ✅ 暴露 `token` 属性给所有组件
2. ✅ 登录时自动设置 token
3. ✅ 刷新页面时自动恢复 token
4. ✅ 登出时自动清除 token
5. ✅ 详细的日志追踪 token 状态

GameLobby 组件现在可以正确获取 token，创建房间功能应该正常工作了！
