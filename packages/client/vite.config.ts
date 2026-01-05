import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('[代理错误]', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('[发送请求]', req.method, req.url, '-> http://localhost:3001' + req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('[收到响应]', proxyRes.statusCode, req.url);
          });
        }
      },
      '/ai': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('[AI 服务代理错误]', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('[发送 AI 请求]', req.method, req.url, '-> http://localhost:8000' + req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('[收到 AI 响应]', proxyRes.statusCode, req.url);
          });
        }
      }
    }
  }
});
