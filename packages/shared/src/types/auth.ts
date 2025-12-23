/**
 * Authentication and User types
 */

// ============================================================================
// User
// ============================================================================

export interface User {
  id: string;
  username: string;
  createdAt: number;
}

export interface UserInternal extends User {
  passwordHash: string;
}

// ============================================================================
// Auth DTOs
// ============================================================================

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface RegisterResponse {
  user: User;
  token: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface MeResponse {
  user: User;
}

// ============================================================================
// JWT Payload
// ============================================================================

export interface JWTPayload {
  userId: string;
  username: string;
  iat: number;
  exp: number;
}
