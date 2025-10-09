import api from './index'

export interface Repo {
  id: number
  name: string
  url: string
  branch: string
  localPath: string
  description?: string
  lastPulled?: string
  createdAt: string
  updatedAt: string
}

export interface CreateRepoData {
  name: string
  url: string
  branch: string
  localPath: string
  description?: string
}

export interface UpdateRepoData {
  name?: string
  url?: string
  branch?: string
  localPath?: string
  description?: string
}

/**
 * 获取所有仓库
 */
export const getAllRepos = () => {
  return api.get<any, Repo[]>('/repos')
}

/**
 * 获取仓库详情
 */
export const getRepo = (id: number) => {
  return api.get<any, Repo>(`/repos/${id}`)
}

/**
 * 创建仓库
 */
export const createRepo = (data: CreateRepoData) => {
  return api.post<any, Repo>('/repos', data)
}

/**
 * 更新仓库
 */
export const updateRepo = (id: number, data: UpdateRepoData) => {
  return api.put<any, Repo>(`/repos/${id}`, data)
}

/**
 * 删除仓库
 */
export const deleteRepo = (id: number) => {
  return api.delete<any, { message: string }>(`/repos/${id}`)
}

/**
 * 克隆仓库
 */
export const cloneRepo = (id: number) => {
  return api.post<any, { message: string }>(`/repos/${id}/clone`)
}

/**
 * 拉取仓库更新
 */
export const pullRepo = (id: number) => {
  return api.post<any, { message: string }>(`/repos/${id}/pull`)
}

/**
 * 检查仓库状态
 */
export const checkRepoStatus = (id: number) => {
  return api.get<any, { status: string; message: string }>(`/repos/${id}/status`)
}
