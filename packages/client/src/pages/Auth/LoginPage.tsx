/**
 * Login Page
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import './AuthPage.css';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    const success = await login(username, password);
    if (success) {
      navigate('/game');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1 className="auth-title">登录</h1>
          <div className="auth-subtitle">EXCLUSION ZONE</div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label" htmlFor="username">
              用户名
            </label>
            <input
              id="username"
              type="text"
              className="auth-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="输入用户名"
              required
              autoComplete="username"
              disabled={isLoading}
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="password">
              密码
            </label>
            <input
              id="password"
              type="password"
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入密码"
              required
              autoComplete="current-password"
              disabled={isLoading}
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-button" disabled={isLoading}>
            {isLoading ? (
              <div className="auth-loading">
                <div className="auth-spinner"></div>
                <span>登录中...</span>
              </div>
            ) : (
              '登录'
            )}
          </button>
        </form>

        <div className="auth-footer">
          没有账号？{' '}
          <Link to="/register" className="auth-link">
            立即注册
          </Link>
        </div>
      </div>
    </div>
  );
};
