import api from './index'

export interface Binding {
  id: number
  instanceId: number
  repoId: number
  targetPath: string
  autoUpdate: boolean
  createdAt: string
  updatedAt: string
  instance?: {
    id: number
    name: string
  }
  repo?: {
    id: number
    name: string
  }
}

export interface CreateBindingData {
  instanceId: number
  repoId: number
  targetPath: string
  autoUpdate?: boolean
}

export interface UpdateBindingData {
  targetPath?: string
  autoUpdate?: boolean
}

export interface BatchBindingData {
  instanceIds: number[]
  repoId: number
  targetPath: string
  autoUpdate?: boolean
}

/**
 * 获取所有绑定
 */
export const getAllBindings = () => {
  return api.get<any, Binding[]>('/bindings')
}

/**
 * 获取实例的绑定
 */
export const getInstanceBindings = (instanceId: number) => {
  return api.get<any, Binding[]>(`/bindings/instance/${instanceId}`)
}

/**
 * 获取仓库的绑定
 */
export const getRepoBindings = (repoId: number) => {
  return api.get<any, Binding[]>(`/bindings/repo/${repoId}`)
}

/**
 * 创建绑定
 */
export const createBinding = (data: CreateBindingData) => {
  return api.post<any, Binding>('/bindings', data)
}

/**
 * 批量创建绑定
 */
export const batchCreateBindings = (data: BatchBindingData) => {
  return api.post<any, { message: string; bindings: Binding[] }>('/bindings/batch', data)
}

/**
 * 更新绑定
 */
export const updateBinding = (id: number, data: UpdateBindingData) => {
  return api.put<any, Binding>(`/bindings/${id}`, data)
}

/**
 * 删除绑定
 */
export const deleteBinding = (id: number) => {
  return api.delete<any, { message: string }>(`/bindings/${id}`)
}

/**
 * 同步绑定 (拷贝仓库文件到实例)
 */
export const syncBinding = (id: number) => {
  return api.post<any, { message: string }>(`/bindings/${id}/sync`)
}

/**
 * 批量同步绑定
 */
export const batchSyncBindings = (ids: number[]) => {
  return api.post<any, { message: string }>('/bindings/batch-sync', { ids })
}
