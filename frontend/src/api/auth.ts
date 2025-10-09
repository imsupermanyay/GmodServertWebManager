import api from './index'

export interface LoginData {
  username: string
  password: string
}

export interface User {
  id: number
  username: string
  role: 'SUPER_ADMIN' | 'ADMIN'
  createdAt: string
  updatedAt: string
}

export interface LoginResponse {
  user: User
  message: string
}

export interface MeResponse {
  user: User
}

/**
 * 用户登录
 */
export const login = (data: LoginData) => {
  return api.post<any, LoginResponse>('/auth/login', data)
}

/**
 * 用户登出
 */
export const logout = () => {
  return api.post<any, { message: string }>('/auth/logout')
}

/**
 * 获取当前用户信息
 */
export const me = () => {
  return api.get<any, MeResponse>('/auth/me')
}
