export enum JobType {
  GIT_SYNC = 'GIT_SYNC',                 // Git 代码同步
  INSTANCE_START = 'INSTANCE_START',     // 启动实例
  INSTANCE_STOP = 'INSTANCE_STOP',       // 停止实例
  INSTANCE_RESTART = 'INSTANCE_RESTART', // 重启实例
  LINK_REFRESH = 'LINK_REFRESH',         // 刷新软链接
}
