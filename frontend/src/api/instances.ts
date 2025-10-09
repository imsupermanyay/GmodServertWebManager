import api from './index'

export interface Instance {
  id: number
  name: string
  path: string
  port: number
  maxPlayers: number
  gamemode: string
  map: string
  workshopCollection?: string
  status: 'running' | 'stopped'
  pid?: number
  uptime?: number
  players?: number
  createdAt: string
  updatedAt: string
}

export interface CreateInstanceData {
  name: string
  path: string
  port: number
  maxPlayers: number
  gamemode: string
  map: string
  workshopCollection?: string
}

export interface UpdateInstanceData {
  name?: string
  path?: string
  port?: number
  maxPlayers?: number
  gamemode?: string
  map?: string
  workshopCollection?: string
}

/**
 * 获取所有实例 (超级管理员)
 */
export const getAllInstances = () => {
  return api.get<any, Instance[]>('/instances')
}

/**
 * 获取我的实例 (普通管理员)
 */
export const getMyInstances = () => {
  return api.get<any, Instance[]>('/instances/my')
}

/**
 * 获取实例详情
 */
export const getInstance = (id: number) => {
  return api.get<any, Instance>(`/instances/${id}`)
}

/**
 * 创建实例
 */
export const createInstance = (data: CreateInstanceData) => {
  return api.post<any, Instance>('/instances', data)
}

/**
 * 更新实例
 */
export const updateInstance = (id: number, data: UpdateInstanceData) => {
  return api.put<any, Instance>(`/instances/${id}`, data)
}

/**
 * 删除实例
 */
export const deleteInstance = (id: number) => {
  return api.delete<any, { message: string }>(`/instances/${id}`)
}

/**
 * 启动实例
 */
export const startInstance = (id: number) => {
  return api.post<any, { message: string; pid: number }>(`/instances/${id}/start`)
}

/**
 * 停止实例
 */
export const stopInstance = (id: number) => {
  return api.post<any, { message: string }>(`/instances/${id}/stop`)
}

/**
 * 重启实例
 */
export const restartInstance = (id: number) => {
  return api.post<any, { message: string }>(`/instances/${id}/restart`)
}

/**
 * 获取实例日志
 */
export const getInstanceLogs = (id: number, lines: number = 100) => {
  return api.get<any, { logs: string }>(`/instances/${id}/logs`, {
    params: { lines }
  })
}

/**
 * 执行控制台命令
 */
export const executeCommand = (id: number, command: string) => {
  return api.post<any, { message: string }>(`/instances/${id}/command`, { command })
}
