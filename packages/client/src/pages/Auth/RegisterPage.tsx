/**
 * Register Page
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import './AuthPage.css';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setLocalError('密码不匹配');
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setLocalError('密码至少需要6个字符');
      return;
    }

    const success = await register(username, password);
    if (success) {
      navigate('/game');
    }
  };

  const displayError = localError || error;

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1 className="auth-title">注册</h1>
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
              placeholder="3-20个字符"
              required
              minLength={3}
              maxLength={20}
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
              placeholder="至少6个字符"
              required
              minLength={6}
              autoComplete="new-password"
              disabled={isLoading}
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="confirmPassword">
              确认密码
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="auth-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再次输入密码"
              required
              minLength={6}
              autoComplete="new-password"
              disabled={isLoading}
            />
          </div>

          {displayError && <div className="auth-error">{displayError}</div>}

          <button type="submit" className="auth-button" disabled={isLoading}>
            {isLoading ? (
              <div className="auth-loading">
                <div className="auth-spinner"></div>
                <span>注册中...</span>
              </div>
            ) : (
              '注册'
            )}
          </button>
        </form>

        <div className="auth-footer">
          已有账号？{' '}
          <Link to="/login" className="auth-link">
            立即登录
          </Link>
        </div>
      </div>
    </div>
  );
};
