/**
 * Authentication and User types
 */
export interface User {
    id: string;
    username: string;
    createdAt: number;
}
export interface UserInternal extends User {
    passwordHash: string;
}
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
export interface JWTPayload {
    userId: string;
    username: string;
    iat: number;
    exp: number;
}
//# sourceMappingURL=auth.d.ts.map