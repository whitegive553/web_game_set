# 需要手动修复的文件清单

以下文件需要将硬编码的 `http://localhost:3001` 替换为 API_CONFIG：

## 1. AvalonGame.tsx
```diff
+ import { API_CONFIG } from '../../config/api';

- fetch('http://localhost:3001/api/lobby/my-room',
+ fetch(`${API_CONFIG.LOBBY_API}/my-room`,

- fetch(`http://localhost:3001/api/lobby/rooms/${roomId}/leave`,
+ fetch(`${API_CONFIG.LOBBY_API}/rooms/${roomId}/leave`,
```

## 2. AvalonRoom.tsx
```diff
+ import { API_CONFIG } from '../../config/api';

- fetch(`http://localhost:3001/api/lobby/rooms/${roomId}`,
+ fetch(`${API_CONFIG.LOBBY_API}/rooms/${roomId}`,

- fetch(`http://localhost:3001/api/lobby/rooms/${roomId}/ready`,
+ fetch(`${API_CONFIG.LOBBY_API}/rooms/${roomId}/ready`,

- fetch(`http://localhost:3001/api/avalon/${roomId}/start`,
+ fetch(`${API_CONFIG.AVALON_API}/${roomId}/start`,

- fetch(`http://localhost:3001/api/lobby/rooms/${roomId}/leave`,
+ fetch(`${API_CONFIG.LOBBY_API}/rooms/${roomId}/leave`,
```

## 3. GamePlay.tsx
```diff
+ import { API_CONFIG } from '../../config/api';

- 所有 http://localhost:3001/api/auth 改为 ${API_CONFIG.AUTH_API}
```

## 4. History.tsx
```diff
+ import { API_CONFIG } from '../../config/api';

- 所有 http://localhost:3001/api/auth 改为 ${API_CONFIG.AUTH_API}
```

## 5. Achievements.tsx
```diff
+ import { API_CONFIG } from '../../config/api';

- 所有 http://localhost:3001/api/auth 改为 ${API_CONFIG.AUTH_API}
```

或者在服务器部署时，确保后端 CORS 允许所有来源（我已经修改了）。
