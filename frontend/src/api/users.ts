import api from './index'

export interface User {
  id: number
  username: string
  role: 'SUPER_ADMIN' | 'ADMIN'
  createdAt: string
  updatedAt: string
}

export interface CreateUserData {
  username: string
  password: string
  role: 'SUPER_ADMIN' | 'ADMIN'
}

export interface UpdateUserData {
  username?: string
  password?: string
  role?: 'SUPER_ADMIN' | 'ADMIN'
}

/**
 * 获取所有用户
 */
export const getAllUsers = () => {
  return api.get<any, User[]>('/users')
}

/**
 * 获取用户详情
 */
export const getUser = (id: number) => {
  return api.get<any, User>(`/users/${id}`)
}

/**
 * 创建用户
 */
export const createUser = (data: CreateUserData) => {
  return api.post<any, User>('/users', data)
}

/**
 * 更新用户
 */
export const updateUser = (id: number, data: UpdateUserData) => {
  return api.put<any, User>(`/users/${id}`, data)
}

/**
 * 删除用户
 */
export const deleteUser = (id: number) => {
  return api.delete<any, { message: string }>(`/users/${id}`)
}
