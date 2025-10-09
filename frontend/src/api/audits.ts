import api from './index'

export interface AuditLog {
  id: number
  userId: number
  username: string
  action: string
  target: string
  details?: string
  ipAddress?: string
  createdAt: string
}

export interface AuditQueryParams {
  page?: number
  limit?: number
  userId?: number
  action?: string
  startDate?: string
  endDate?: string
}

export interface AuditResponse {
  logs: AuditLog[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * 获取审计日志
 */
export const getAuditLogs = (params?: AuditQueryParams) => {
  return api.get<any, AuditResponse>('/audits', { params })
}

/**
 * 导出审计日志
 */
export const exportAuditLogs = (params?: AuditQueryParams) => {
  return api.get<any, Blob>('/audits/export', {
    params,
    responseType: 'blob'
  })
}
