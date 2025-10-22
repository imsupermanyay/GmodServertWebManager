<template>
  <div class="relative flex flex-col gap-6 h-[calc(100vh-5rem)] text-slate-100">
    <div
      v-if="showScreenOverlay"
      class="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-slate-950/80 backdrop-blur-sm text-slate-200"
    >
      <div class="h-12 w-12 animate-spin rounded-full border-4 border-blue-500/30 border-t-blue-400"></div>
      <div class="text-lg font-semibold">{{ screenOverlayMessage }}</div>
      <p class="text-sm text-slate-400">请稍候，操作完成后页面将自动刷新。</p>
    </div>

    <header class="flex flex-col gap-4 flex-none xl:flex-row xl:items-start xl:justify-between">
      <div class="space-y-2">
        <button
          class="inline-flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200 transition"
          @click="goBack"
        >
          <span class="text-lg">←</span>
          返回实例列表
        </button>
        <div class="flex items-center gap-3 flex-wrap">
          <h1 class="text-3xl font-semibold tracking-tight text-white">
            {{ instanceData?.name || '实例详情' }}
          </h1>
          <span
            v-if="instanceData"
            class="px-3 py-1 text-xs font-semibold rounded-full border"
            :class="getStatusBadge(instanceData.status)"
          >
            {{ getStatusText(instanceData.status) }}
            <span class="opacity-80">
              - {{ instanceData.gamemodeName || '未绑定模式' }}
            </span>
          </span>
        </div>
        <p class="text-sm text-slate-400">
          监控实例状态、资源占用与控制台输出，快速定位问题与执行运维操作。
        </p>
      </div>
      <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div class="flex flex-wrap gap-2">
          <!-- <button
            @click="refreshAll"
            :disabled="isLoading"
            class="px-4 py-2 text-sm font-medium rounded-lg border border-blue-400/40 bg-blue-500/10 text-blue-200 hover:bg-blue-500/20 hover:border-blue-300/70 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            手动刷新
          </button> -->
          <button
            @click="openCfgEditor"
            :disabled="!instanceData"
            class="px-4 py-2 text-sm font-medium rounded-lg border border-purple-400/40 bg-purple-500/10 text-purple-200 hover:bg-purple-500/20 hover:border-purple-300/60 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            编辑 CFG
          </button>
          <button
            @click="openStartupViewer"
            :disabled="!instanceData"
            class="px-4 py-2 text-sm font-medium rounded-lg border border-indigo-400/40 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/20 hover:border-indigo-300/60 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            查看启动项
          </button>
          <button
            @click="openFileManager"
            :disabled="!instanceData"
            class="px-4 py-2 text-sm font-medium rounded-lg border border-teal-400/40 bg-teal-500/10 text-teal-200 hover:bg-teal-500/20 hover:border-teal-300/60 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            文件管理
          </button>
          <button
            @click="openSyncLogsDialog"
            :disabled="!instanceData || !instanceData.gamemodeName"
            class="px-4 py-2 text-sm font-medium rounded-lg border border-cyan-400/40 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20 hover:border-cyan-300/60 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
            :title="!instanceData?.gamemodeName ? '此实例未关联游戏模式' : ''"
          >
            同步模式文件
          </button>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            @click="startInstance"
            :disabled="!instanceData || isContainerRunning || containerActionLoading"
            class="px-4 py-2 text-sm font-medium rounded-lg border border-emerald-400/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 hover:border-emerald-300/60 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            <span
              class="w-2 h-2 rounded-full"
              :class="isContainerRunning ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'"
            ></span>
            开机
          </button>
          <button
            @click="stopInstance"
            :disabled="!instanceData || !isContainerRunning || containerActionLoading"
            class="px-4 py-2 text-sm font-medium rounded-lg border border-rose-400/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20 hover:border-rose-300/60 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            关机
          </button>
          <button
            @click="restartInstance"
            :disabled="!instanceData || !isContainerRunning || containerActionLoading"
            class="px-4 py-2 text-sm font-medium rounded-lg border border-amber-400/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 hover:border-amber-300/60 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-2"
          >

            重启
          </button>
        </div>
        <!-- <div class="flex flex-wrap gap-2">
          <button
            @click="startServer"
            :disabled="!instanceData || !isContainerRunning || serverActionLoading"
            class="px-4 py-2 text-sm font-medium rounded-lg border border-emerald-400/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 hover:border-emerald-300/60 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            <span
              class="w-2 h-2 rounded-full"
              :class="isServerRunning ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'"
            ></span>
            启动服务器
          </button>
          <button
            @click="stopServer"
            :disabled="!instanceData || !isContainerRunning || serverActionLoading"
            class="px-4 py-2 text-sm font-medium rounded-lg border border-rose-400/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20 hover:border-rose-300/60 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            <span
              class="w-2 h-2 rounded-full"
              :class="isServerRunning ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'"
            ></span>
            关闭服务器
          </button>
          <button
            @click="restartServer"
            :disabled="!instanceData || !isContainerRunning || serverActionLoading"
            class="px-4 py-2 text-sm font-medium rounded-lg border border-amber-400/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 hover:border-amber-300/60 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            <span
              class="w-2 h-2 rounded-full"
              :class="isServerRunning ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'"
            ></span>
            重启服务器
          </button>
        </div> -->
      </div>
    </header>

    <div v-if="!instanceData && isLoading" class="flex-1 rounded-xl border border-white/10 bg-slate-900/50 flex items-center justify-center text-slate-400">
      正在加载实例信息，请稍候…
    </div>

    <div v-else-if="!instanceData" class="flex-1 rounded-xl border border-rose-500/40 bg-rose-500/10 flex items-center justify-center text-rose-200">
      未找到实例，或您无权访问该实例。
    </div>

    <div v-else class="flex-1 grid gap-5 overflow-hidden lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <section class="flex flex-col rounded-2xl border border-white/10 bg-slate-900/60 shadow-xl shadow-black/30 min-h-0">
        <div class="flex items-center justify-between px-5 py-3 border-b border-white/5 flex-none">
          <div>
            <h2 class="text-lg font-semibold text-white">控制台输出</h2>
            <p class="text-xs text-slate-400 mt-1">
              最新日志自动停靠在底部，支持关闭自动刷新后手动浏览历史输出。
            </p>
          </div>
          <div class="flex items-center gap-4 text-xs text-slate-400">
            <label class="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                v-model="autoRefresh"
                :disabled="useRealtimeLogs"
                class="rounded border-slate-600 bg-slate-800 text-blue-400 focus:ring-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
              />
              自动刷新（5 秒）
            </label>
            <button class="text-blue-300 hover:text-blue-200 transition" @click="refreshLogs">
              立即刷新  
            </button>
            <button class="text-red-300 hover:text-red-200 transition" @click="clearLogs">
              清空
            </button>
          </div>
        </div>
        <div
          ref="consoleRef"
          class="flex-1 bg-slate-950 text-emerald-300 text-xs font-mono overflow-auto whitespace-pre-wrap px-5 py-4 scroll-sleek"
        >
          {{ detailLogs || '暂无日志输出。' }}
        </div>
        <div class="flex-none border-t border-white/5 px-5 py-3 bg-slate-900/50 rounded-b-2xl">
          <form @submit.prevent="sendCommand" class="flex gap-2">
            <input
              v-model="commandInput"
              type="text"
              placeholder="输入RCON命令并按 Enter 发送到服务器..."
              :disabled="!isServerRunning"
              class="flex-1 px-3 py-2 text-sm bg-slate-950 border border-white/10 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-400/50 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              :disabled="!isServerRunning || !commandInput.trim()"
              class="px-4 py-2 text-sm font-medium rounded-lg border border-blue-400/40 bg-blue-500/10 text-blue-200 hover:bg-blue-500/20 hover:border-blue-300/70 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              发送
            </button>
          </form>
          <p class="text-[11px] text-slate-500 mt-2">提示：仅当GMOD服务器运行时可发送命令</p>
        </div>
      </section>

      <div class="flex flex-col gap-5 overflow-hidden">
        <section class="flex-1 min-h-0 rounded-2xl border border-white/10 bg-slate-900/50 p-5 shadow-lg shadow-black/25 flex flex-col">
          <div class="flex items-center justify-between mb-3 flex-none">
            <div>
              <h2 class="text-lg font-semibold text-white">运行概览</h2>
              <p class="text-xs text-slate-400 mt-1">实例状态、关键时间与端口映射。</p>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-200 overflow-auto pr-1 scroll-sleek">
            <div class="bg-slate-900/80 border border-white/5 rounded-lg px-4 py-3 md:col-span-2">
              <p class="text-slate-500 uppercase tracking-wide text-[11px]">端口映射</p>
              <p class="text-white font-semibold mt-1 font-mono text-sm">
                {{ formattedPorts }}
              </p>
            </div>

            <div class="bg-slate-900/80 border border-white/5 rounded-lg px-4 py-3">
              <p class="text-slate-500 uppercase tracking-wide text-[11px]">运行时长</p>
              <p class="text-white font-semibold mt-1">{{ formattedUptime }}</p>
            </div>
            <div class="bg-slate-900/80 border border-white/5 rounded-lg px-4 py-3">
              <p class="text-slate-500 uppercase tracking-wide text-[11px]">Docker ID</p>
              <p class="font-mono text-xs break-all text-slate-200 mt-1">
                {{ instanceData.dockerId || '未设置' }}
              </p>
            </div>
            <div class="bg-slate-900/80 border border-white/5 rounded-lg px-4 py-3">
              <p class="text-slate-500 uppercase tracking-wide text-[11px]">镜像</p>
              <p class="font-mono text-xs break-all text-slate-200 mt-1">
                {{ instanceData.dockerImage || 'lacledeslan/steamcmd:latest' }}
              </p>
            </div>
            <div class="bg-slate-900/80 border border-white/5 rounded-lg px-4 py-3 md:col-span-2">
              <p class="text-slate-500 uppercase tracking-wide text-[11px]">容器名称</p>
              <p class="text-white font-semibold mt-1">
                {{ instanceData.containerName || '未设置' }}
              </p>
            </div>

          </div>
        </section>

        <section class="flex-1 min-h-0 rounded-2xl border border-white/10 bg-slate-900/50 p-5 shadow-lg shadow-black/25 flex flex-col">
          <div class="flex items-center justify-between mb-3 flex-none">
            <h2 class="text-lg font-semibold text-white">资源监控</h2>
            <p class="text-xs text-slate-400">CPU、内存、网络与磁盘实时占用情况。</p>
          </div>
          <div
            v-if="detailStats"
            class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-200 overflow-auto pr-1 scroll-sleek"
          >
            <div class="bg-slate-900/80 border border-white/5 rounded-lg px-4 py-3 shadow-inner shadow-black/30">
              <p class="text-slate-500 uppercase tracking-wide text-[11px]">CPU 使用率</p>
              <p class="text-2xl font-semibold text-white mt-1">
                {{ formatPercentage(detailStats.cpuPercent) }}
              </p>
            </div>
            <div class="bg-slate-900/80 border border-white/5 rounded-lg px-4 py-3 shadow-inner shadow-black/30">
              <p class="text-slate-500 uppercase tracking-wide text-[11px]">内存使用</p>
              <p class="text-2xl font-semibold text-white mt-1">
                {{ formatBytes(detailStats.memoryUsage) }}
              </p>
              <p class="text-[11px] text-slate-400 mt-1">
                共 {{ formatBytes(detailStats.memoryLimit) }}
                · {{ formatPercentage(detailStats.memoryPercent) }}
              </p>
            </div>
            <div class="bg-slate-900/80 border border-white/5 rounded-lg px-4 py-3 shadow-inner shadow-black/30">
              <p class="text-slate-500 uppercase tracking-wide text-[11px]">网络</p>
              <p class="text-sm font-medium text-white mt-1">
                ↑ {{ formatBytes(detailStats.network.txBytes) }}
              </p>
              <p class="text-[11px] text-slate-400">
                ↓ {{ formatBytes(detailStats.network.rxBytes) }}
              </p>
            </div>
            <div class="bg-slate-900/80 border border-white/5 rounded-lg px-4 py-3 shadow-inner shadow-black/30">
              <p class="text-slate-500 uppercase tracking-wide text-[11px]">磁盘 I/O</p>
              <p class="text-sm font-medium text-white mt-1">
                读 {{ formatBytes(detailStats.blockIO.read) }}
              </p>
              <p class="text-[11px] text-slate-400">
                写 {{ formatBytes(detailStats.blockIO.write) }}
              </p>
            </div>
          </div>
          <p v-else class="text-xs text-slate-400 flex-1 flex items-center">
            实例未运行，暂未获取到实时资源数据。
          </p>
        </section>
      </div>
    </div>

    <!-- CFG 编辑模态框 -->
    <div v-if="showCfgModal" class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-slate-900 rounded-2xl border border-white/10 w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl shadow-black/50">
        <div class="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h3 class="text-xl font-bold text-white">编辑 CFG 配置</h3>
          <button @click="showCfgModal = false" class="text-slate-400 hover:text-white transition">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="overflow-y-auto max-h-[calc(90vh-140px)] scroll-sleek">
          <div class="p-6 space-y-6">
            <!-- 模板内容（只读） -->
            <div v-if="cfgTemplateContent">
              <label class="block text-sm font-medium text-slate-300 mb-2">
                CFG 模板内容（只读）
              </label>
              <pre class="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-lg text-emerald-300 font-mono text-xs whitespace-pre-wrap">{{ cfgTemplateContent }}</pre>
            </div>
            <div v-else class="text-sm text-slate-400 bg-slate-800/50 border border-white/5 rounded-lg px-4 py-3">
              未设置 CFG 模板
            </div>

            <!-- 自定义配置（可编辑） -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-2">
                自定义配置（可编辑）
              </label>
              <textarea
                v-model="customCfgContent"
                rows="12"
                class="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-lg text-slate-200 font-mono text-xs placeholder-slate-500 focus:outline-none focus:border-blue-400/50 transition"
                placeholder="在此添加您的自定义配置..."
              ></textarea>
              <p class="text-xs text-slate-400 mt-2">
                自定义配置将追加到模板内容之后，并自动写入容器的 /opt/steam/gamemode/cfg/server.cfg 文件
              </p>
            </div>
          </div>
        </div>

        <div class="px-6 py-4 border-t border-white/10 flex justify-end space-x-3">
          <button
            @click="showCfgModal = false"
            class="px-5 py-2 text-sm font-medium rounded-lg border border-slate-500/40 bg-slate-700/30 text-slate-200 hover:bg-slate-700/50 hover:border-slate-400/60 transition"
          >
            取消
          </button>
          <button
            @click="saveCfg"
            :disabled="isSavingCfg"
            class="px-5 py-2 text-sm font-medium rounded-lg border border-blue-400/40 bg-blue-500/20 text-blue-200 hover:bg-blue-500/30 hover:border-blue-300/70 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {{ isSavingCfg ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 启动项查看模态框 -->
    <div v-if="showStartupModal" class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-slate-900 rounded-2xl border border-white/10 w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl shadow-black/50">
        <div class="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h3 class="text-xl font-bold text-white">查看启动项</h3>
          <button @click="showStartupModal = false" class="text-slate-400 hover:text-white transition">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="overflow-y-auto max-h-[calc(90vh-120px)] scroll-sleek p-6">
          <div v-if="startupOptionContent">
            <label class="block text-sm font-medium text-slate-300 mb-3">
              启动项内容
            </label>
            <pre class="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-lg text-emerald-300 font-mono text-xs whitespace-pre-wrap">{{ startupOptionContent }}</pre>
            <p class="text-xs text-slate-400 mt-3">
              此启动项将在容器启动时自动应用
            </p>
          </div>
          <div v-else class="text-center py-12">
            <svg class="w-16 h-16 mx-auto text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p class="text-slate-400 text-sm">未设置启动项</p>
            <p class="text-slate-500 text-xs mt-2">请联系超级管理员为此实例配置启动项</p>
          </div>
        </div>

        <div class="px-6 py-4 border-t border-white/10 flex justify-end">
          <button
            @click="showStartupModal = false"
            class="px-5 py-2 text-sm font-medium rounded-lg border border-slate-500/40 bg-slate-700/30 text-slate-200 hover:bg-slate-700/50 hover:border-slate-400/60 transition"
          >
            关闭
          </button>
        </div>
      </div>
    </div>

    <!-- 文件管理模态框 -->
    <div v-if="showFileManagerModal" class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-slate-900 rounded-2xl border border-white/10 w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl shadow-black/50">
        <div class="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h3 class="text-xl font-bold text-white">文件管理 - BUILD 目录</h3>
          <button @click="showFileManagerModal = false" class="text-slate-400 hover:text-white transition">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="overflow-y-auto max-h-[calc(90vh-200px)] scroll-sleek">
          <div class="p-6">
            <!-- 当前路径 -->
            <div class="mb-4 bg-slate-800/50 border border-white/5 rounded-lg px-4 py-2 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <span class="text-sm text-slate-300 font-mono">{{ currentPath || '/' }}</span>
              </div>
              <button
                v-if="currentPath"
                @click="navigateUp"
                class="px-3 py-1 text-xs font-medium rounded-lg border border-slate-500/40 bg-slate-700/30 text-slate-200 hover:bg-slate-700/50 hover:border-slate-400/60 transition"
              >
                返回上级
              </button>
            </div>

            <!-- 工具栏 -->
            <div class="mb-4 flex flex-wrap items-center gap-3">
              <!-- 上传按钮组 -->
              <div class="flex items-center gap-2">
                <input type="file" ref="fileInput" @change="handleFileSelect" multiple class="hidden" />
                <input type="file" ref="folderInput" @change="handleFolderSelect" webkitdirectory directory multiple class="hidden" />

                <button
                  @click="$refs.fileInput.click()"
                  class="px-3 py-2 text-sm font-medium rounded-lg border border-blue-400/40 bg-blue-500/20 text-blue-200 hover:bg-blue-500/30 hover:border-blue-300/70 hover:text-white transition flex items-center gap-2"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  上传文件
                </button>

                <button
                  @click="$refs.folderInput.click()"
                  class="px-3 py-2 text-sm font-medium rounded-lg border border-purple-400/40 bg-purple-500/20 text-purple-200 hover:bg-purple-500/30 hover:border-purple-300/70 hover:text-white transition flex items-center gap-2"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  上传文件夹
                </button>
              </div>

              <!-- 全选按钮 -->
              <button
                v-if="fileList.length > 0"
                @click="toggleSelectAll"
                class="px-3 py-2 text-sm font-medium rounded-lg border border-cyan-400/40 bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30 hover:border-cyan-300/70 hover:text-white transition flex items-center gap-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                {{ selectedFiles.length === fileList.length ? '取消全选' : '全选' }}
              </button>

              <!-- 多选操作按钮组 -->
              <div v-if="selectedFiles.length > 0" class="flex items-center gap-2 ml-auto">
                <span class="text-sm text-slate-300">已选择 {{ selectedFiles.length }} 项</span>
                <button
                  @click="downloadSelected"
                  class="px-3 py-2 text-sm font-medium rounded-lg border border-emerald-400/40 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 hover:border-emerald-300/70 hover:text-white transition"
                >
                  下载选中
                </button>
                <button
                  @click="deleteSelected"
                  class="px-3 py-2 text-sm font-medium rounded-lg border border-rose-400/40 bg-rose-500/20 text-rose-200 hover:bg-rose-500/30 hover:border-rose-300/70 hover:text-white transition"
                >
                  删除选中
                </button>
                <button
                  @click="clearSelection"
                  class="px-3 py-2 text-sm font-medium rounded-lg border border-slate-500/40 bg-slate-700/30 text-slate-200 hover:bg-slate-700/50 hover:border-slate-400/60 transition"
                >
                  取消选择
                </button>
              </div>
            </div>

            <!-- 上传进度提示 -->
            <div v-if="uploadingFiles.length > 0" class="mb-4 bg-blue-500/10 border border-blue-400/40 rounded-lg p-4">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-blue-200">正在上传文件...</span>
                <span class="text-xs text-blue-300">{{ uploadProgress }} / {{ uploadingFiles.length }}</span>
              </div>
              <div class="w-full bg-slate-800 rounded-full h-2 mb-2">
                <div
                  class="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  :style="{ width: `${(uploadProgress / uploadingFiles.length) * 100}%` }"
                ></div>
              </div>
              <div class="text-xs text-slate-400 max-h-20 overflow-y-auto">
                <div v-for="(file, idx) in uploadingFiles" :key="idx" class="flex items-center gap-2 py-1">
                  <svg v-if="idx < uploadProgress" class="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                  <svg v-else-if="idx === uploadProgress" class="w-3 h-3 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <svg v-else class="w-3 h-3 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clip-rule="evenodd" />
                  </svg>
                  <span :class="idx < uploadProgress ? 'text-green-300' : idx === uploadProgress ? 'text-blue-300' : 'text-slate-400'">
                    {{ file.name }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 文件列表 - 网格布局 -->
            <div v-if="isLoadingFiles" class="text-center py-12 text-slate-400">
              <div class="h-8 w-8 animate-spin rounded-full border-4 border-blue-500/30 border-t-blue-400 mx-auto mb-4"></div>
              加载中...
            </div>
            <div v-else-if="fileList.length === 0" class="text-center py-12 text-slate-400">
              <svg class="w-16 h-16 mx-auto text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <p class="text-sm">目录为空</p>
            </div>
            <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              <div
                v-for="file in fileList"
                :key="file.name"
                @click="handleFileClick(file)"
                :class="[
                  'relative bg-slate-800/50 border rounded-lg p-4 cursor-pointer transition-all select-none',
                  isFileSelected(file)
                    ? 'border-blue-400 bg-blue-500/20 ring-2 ring-blue-400/50'
                    : 'border-white/5 hover:border-blue-400/40 hover:bg-slate-800/70'
                ]"
              >
                <!-- 选中标记 -->
                <div
                  class="absolute top-2 right-2 z-10"
                  @click.stop="toggleFileSelection(file)"
                >
                  <div
                    :class="[
                      'w-5 h-5 rounded border-2 flex items-center justify-center transition-all hover:scale-110',
                      isFileSelected(file)
                        ? 'bg-blue-500 border-blue-500'
                        : 'bg-slate-700/50 border-slate-600 hover:border-blue-400'
                    ]"
                  >
                    <svg v-if="isFileSelected(file)" class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                  </div>
                </div>

                <!-- 文件图标 -->
                <div class="flex flex-col items-center mb-2 pointer-events-none">
                  <svg v-if="file.isDirectory" class="w-12 h-12 text-blue-400 mb-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                  </svg>
                  <svg v-else class="w-12 h-12 text-slate-400 mb-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd" />
                  </svg>
                </div>

                <!-- 文件名 -->
                <p
                  class="text-xs font-medium text-center text-white truncate mb-1 pointer-events-none"
                  :title="file.name"
                >
                  {{ file.name }}
                </p>

                <!-- 文件信息 -->
                <p class="text-[10px] text-center text-slate-400 pointer-events-none">
                  {{ file.isDirectory ? '文件夹' : formatFileSize(file.size) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="px-6 py-4 border-t border-white/10 flex justify-end">
          <button
            @click="showFileManagerModal = false"
            class="px-5 py-2 text-sm font-medium rounded-lg border border-slate-500/40 bg-slate-700/30 text-slate-200 hover:bg-slate-700/50 hover:border-slate-400/60 transition"
          >
            关闭
          </button>
        </div>
      </div>
    </div>

    <!-- 同步日志对话框 -->
    <div
      v-if="showSyncLogsDialog"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      @click.self="showSyncLogsDialog = false"
    >
      <div class="bg-slate-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col border border-slate-700">
        <!-- 对话框头部 -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div>
            <h2 class="text-xl font-semibold text-white">同步模式文件</h2>
            <p class="text-sm text-slate-400 mt-1">模式: {{ instanceData?.gamemodeName }}</p>
          </div>
          <button
            @click="showSyncLogsDialog = false"
            class="text-slate-400 hover:text-white transition"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- 触发同步按钮 -->
        <div class="px-6 py-4 border-b border-slate-700 bg-slate-750">
          <button
            @click="triggerModeSync"
            :disabled="syncLoading"
            class="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            <svg v-if="syncLoading" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ syncLoading ? '同步中...' : '立即同步' }}
          </button>
        </div>

        <!-- 日志列表 -->
        <div class="flex-1 overflow-y-auto px-6 py-4">
          <div v-if="loadingSyncLogs" class="text-center py-8 text-slate-400">
            加载日志中...
          </div>
          <div v-else-if="syncLogs.length === 0" class="text-center py-8 text-slate-400">
            暂无同步日志
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="log in syncLogs"
              :key="log.id"
              class="bg-slate-700/50 rounded-lg p-4 border border-slate-600 hover:border-slate-500 transition"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-3 mb-2">
                    <span
                      :class="{
                        'bg-green-500/20 text-green-300 border-green-500/30': log.status === 'success',
                        'bg-red-500/20 text-red-300 border-red-500/30': log.status === 'failed',
                        'bg-yellow-500/20 text-yellow-300 border-yellow-500/30': log.status === 'in_progress'
                      }"
                      class="px-2 py-1 text-xs font-semibold rounded border"
                    >
                      {{ getSyncStatusText(log.status) }}
                    </span>
                    <span
                      :class="{
                        'bg-purple-500/20 text-purple-300 border-purple-500/30': log.isManualSync,
                        'bg-slate-600/50 text-slate-300 border-slate-500/30': !log.isManualSync
                      }"
                      class="px-2 py-1 text-xs font-semibold rounded border"
                    >
                      {{ log.isManualSync ? '手动同步' : '自动同步' }}
                    </span>
                    <span class="text-xs text-slate-400">
                      ID: {{ log.id }}
                    </span>
                  </div>
                  <p class="text-sm text-white mb-1">{{ log.message }}</p>
                  <p class="text-xs text-slate-400">
                    开始: {{ formatSyncDate(log.createdAt) }}
                    <span v-if="log.completedAt" class="ml-3">
                      完成: {{ formatSyncDate(log.completedAt) }}
                    </span>
                  </p>
                  <div v-if="log.errorDetails" class="mt-2">
                    <button
                      @click="toggleErrorDetails(log.id)"
                      class="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {{ expandedErrors.has(log.id) ? '隐藏错误详情' : '查看错误详情' }}
                    </button>
                    <pre
                      v-if="expandedErrors.has(log.id)"
                      class="mt-2 p-3 bg-slate-900 rounded text-xs text-red-400 overflow-x-auto border border-red-500/30"
                    >{{ log.errorDetails }}</pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div v-if="syncLogsTotalPages > 1" class="px-6 py-4 border-t border-slate-700 flex items-center justify-between">
          <div class="text-sm text-slate-400">
            第 {{ syncLogsCurrentPage }} / {{ syncLogsTotalPages }} 页，共 {{ syncLogsTotal }} 条
          </div>
          <div class="flex gap-2">
            <button
              @click="loadSyncLogs(syncLogsCurrentPage - 1)"
              :disabled="syncLogsCurrentPage === 1 || loadingSyncLogs"
              class="px-3 py-1 text-sm rounded bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              上一页
            </button>
            <button
              @click="loadSyncLogs(syncLogsCurrentPage + 1)"
              :disabled="syncLogsCurrentPage === syncLogsTotalPages || loadingSyncLogs"
              class="px-3 py-1 text-sm rounded bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              下一页
            </button>
          </div>
        </div>

        <div class="px-6 py-4 border-t border-slate-700 flex justify-end">
          <button
            @click="showSyncLogsDialog = false"
            class="px-5 py-2 text-sm font-medium rounded-lg border border-slate-500/40 bg-slate-700/30 text-slate-200 hover:bg-slate-700/50 hover:border-slate-400/60 transition"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { io } from 'socket.io-client'
import { instancesAPI, cfgTemplatesAPI, startupOptionsAPI, syncAPI } from '../../api'
import { useNotificationStore } from '../../stores/notifications'
import { useAuthStore } from '../../stores/auth'

const props = defineProps({
  id: {
    type: String,
    required: true
  }
})

const router = useRouter()
const notifications = useNotificationStore()
const authStore = useAuthStore()

const hasRealtimeToken = !!authStore.getAuthToken()

const instanceData = ref(null)
const detailLogs = ref('')
const logCursor = ref(null)
const autoRefresh = ref(!hasRealtimeToken)
const isLoading = ref(false)
const commandInput = ref('')
const showCfgModal = ref(false)
const cfgTemplateContent = ref('')
const customCfgContent = ref('')
const isSavingCfg = ref(false)
const showStartupModal = ref(false)
const startupOptionContent = ref('')
const showFileManagerModal = ref(false)
const fileList = ref([])
const currentPath = ref('')
const isLoadingFiles = ref(false)
const fileInput = ref(null)
const folderInput = ref(null)
const uploadProgress = ref(0)
const uploadingFiles = ref([])
const selectedFiles = ref([])
const containerActionLoading = ref(false)
const serverActionLoading = ref(false)
const showScreenOverlay = ref(false)
const screenOverlayMessage = ref('')
const useRealtimeLogs = ref(hasRealtimeToken)
const socketConnected = ref(false)
const showSyncLogsDialog = ref(false)
const syncLogs = ref([])
const loadingSyncLogs = ref(false)
const syncLoading = ref(false)
const syncLogsCurrentPage = ref(1)
const syncLogsTotal = ref(0)
const syncLogsTotalPages = ref(0)
const expandedErrors = ref(new Set())

const consoleRef = ref(null)
let refreshTimer = null
let refreshInFlight = false
let logsSocket = null
let socketReconnectTimer = null
let hasActiveSubscription = false
let containerStartTime = null // 容器启动时间（毫秒时间戳）

const containerInfo = computed(() => instanceData.value?.containerInfo || null)
const detailStats = computed(() => containerInfo.value?.stats || null)
const portMappings = computed(() => containerInfo.value?.ports || [])
const formattedUptime = computed(() =>
  formatDuration(containerInfo.value?.uptimeSeconds || 0)
)
const isContainerRunning = computed(() => instanceData.value?.status === 'RUNNING')
const isServerRunning = computed(() => instanceData.value?.isServerRunning === true)
const numericInstanceId = computed(() => Number(props.id))


// 格式化端口显示
const formattedPorts = computed(() => {
  if (!portMappings.value || portMappings.value.length === 0) {
    return '未设置'
  }

  // 找到 27015 端口的映射
  const port27015 = portMappings.value.find(p => p.containerPort && p.containerPort.includes('27015'))

  if (port27015 && port27015.hostPort) {
    return `${port27015.hostPort} → ${port27015.containerPort}`
  }

  // 如果没找到，显示第一个端口
  const firstPort = portMappings.value[0]
  if (firstPort && firstPort.hostPort) {
    return `${firstPort.hostPort} → ${firstPort.containerPort}`
  }

  return '未分配'
})

const statusBadgeClasses = {
  RUNNING: 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200',
  STOPPED: 'border-slate-500/60 bg-slate-700/40 text-slate-200',
  RESTARTING: 'border-amber-400/60 bg-amber-500/20 text-amber-200',
  ERROR: 'border-rose-400/60 bg-rose-500/20 text-rose-200'
}

const getStatusBadge = (status) => {
  return statusBadgeClasses[status] || 'border-slate-500/60 bg-slate-700/40 text-slate-200'
}

// 已不需要 decodeUtf8，后端已经处理好编码和特殊字符

const scrollConsoleToBottom = () => {
  nextTick(() => {
    if (consoleRef.value) {
      consoleRef.value.scrollTop = consoleRef.value.scrollHeight
    }
  })
}

const getWsEndpoint = () => {
  const raw = import.meta.env.VITE_API_BASE_URL || ''
  if (!raw) {
    return '/ws/instances'
  }

  const normalized = raw
    .replace(/\/$/, '')
    .replace(/\/api$/i, '')
    .replace(/\/api\/$/i, '')

  return `${normalized}/ws/instances`
}

const scheduleSocketReconnect = () => {
  if (!useRealtimeLogs.value) return
  if (socketReconnectTimer) return
  socketReconnectTimer = setTimeout(() => {
    socketReconnectTimer = null
    if (!socketConnected.value) {
      connectLogsSocket()
    }
  }, 5000)
}

const disconnectLogsSocket = () => {
  if (socketReconnectTimer) {
    clearTimeout(socketReconnectTimer)
    socketReconnectTimer = null
  }
  if (logsSocket) {
    if (hasActiveSubscription && !Number.isNaN(numericInstanceId.value)) {
      logsSocket.emit('unsubscribeLogs', { instanceId: numericInstanceId.value })
    }
    logsSocket.off()
    logsSocket.disconnect()
    logsSocket = null
  }
  hasActiveSubscription = false
  socketConnected.value = false
}

const subscribeLogs = (reset = false) => {
  if (!logsSocket || !logsSocket.connected) return
  if (!hasActiveSubscription || reset) {
    detailLogs.value = ''
    logCursor.value = null
  }
  hasActiveSubscription = true
  logsSocket.emit('subscribeLogs', { instanceId: numericInstanceId.value })
}

const connectLogsSocket = () => {
  if (!useRealtimeLogs.value) return
  const token = authStore.getAuthToken()
  if (!token) return

  disconnectLogsSocket()

  logsSocket = io(getWsEndpoint(), {
    withCredentials: true,
    auth: { token }
  })

  logsSocket.on('connect', () => {
    socketConnected.value = true
    hasActiveSubscription = false
    subscribeLogs(true)
  })

  logsSocket.on('disconnect', () => {
    socketConnected.value = false
    hasActiveSubscription = false
    scheduleSocketReconnect()
  })

  logsSocket.on('connect_error', () => {
    socketConnected.value = false
    hasActiveSubscription = false
    scheduleSocketReconnect()
  })

  logsSocket.on('logs', (payload) => {
    if (Number(payload?.instanceId) !== numericInstanceId.value) return
    if (payload?.logs) {
      appendLogs(payload.logs)
      scrollConsoleToBottom()
    }
  })

  logsSocket.on('logs:error', (message) => {
    if (message) {
      notifications.error(message, { title: '日志流错误' })
    }
  })

  logsSocket.on('logs:disconnected', (payload) => {
    if (Number(payload?.instanceId) !== numericInstanceId.value) return
    const reason = payload?.reason || '未知原因'
    notifications.warning(`日志流已断开: ${reason}，将在 3 秒后自动重连...`, { title: '日志流断开' })
  })

  logsSocket.on('logs:reconnected', (payload) => {
    if (Number(payload?.instanceId) !== numericInstanceId.value) return
    notifications.success('日志流已重新连接', { title: '重连成功' })
  })

  logsSocket.on('logs:subscribed', async () => {
    socketConnected.value = true
    console.log('[WebSocket] 日志流已订阅，当前容器状态:', instanceData.value?.status)

    // 只在容器运行时获取初始日志
    if (instanceData.value?.status !== 'RUNNING') {
      console.log('[WebSocket] 容器未运行，跳过日志获取')
      return
    }

    try {
      // 使用当前游标获取日志，如果没有游标则获取全部
      const logParams = logCursor.value !== null ? { since: logCursor.value } : undefined
      const response = await instancesAPI.getLogs(props.id, logParams)
      const shouldResetLogs = !logParams
      applyLogsPayload(response.data, shouldResetLogs)
      scrollConsoleToBottom()
    } catch (error) {
      notifications.error(
        error.response?.data?.message || '加载初始日志失败',
        { title: '日志流' }
      )
    }
  })

  logsSocket.on('commandResult', (payload) => {
    if (Number(payload?.instanceId) !== numericInstanceId.value) return
    if (payload?.error) {
      notifications.error(payload.error, { title: '命令执行失败' })
      appendLogs(`[Command Failed] ${payload.error}`)
      scrollConsoleToBottom()
    } else if (payload?.message) {
      notifications.success(payload.message)
    }
    if (payload?.output) {
      appendLogs(payload.output)
      scrollConsoleToBottom()
    }
  })
}

const appendLogs = (text) => {
  if (!text) return

  const needsSeparator =
    detailLogs.value &&
    !detailLogs.value.endsWith('\n') &&
    !text.startsWith('\n')

  detailLogs.value += needsSeparator ? `\n${text}` : text
}

const applyLogsPayload = (payload, reset = false) => {
  const logsText = payload?.logs ?? ''

  if (reset) {
    detailLogs.value = logsText
  } else if (logsText) {
    appendLogs(logsText)
  }

  if (typeof payload?.cursor === 'number') {
    logCursor.value = payload.cursor
  } else if (reset && !payload?.cursor) {
    logCursor.value = null
  }
}

const loadDetail = async (reset = false) => {
  if (refreshInFlight) return
  refreshInFlight = true

  const shouldShowLoading = reset || !instanceData.value
  if (shouldShowLoading) {
    isLoading.value = true
  }

  if (reset) {
    logCursor.value = null
  }

  try {
    // 先获取实例信息
    const infoResponse = await instancesAPI.getInfo(props.id)
    const newInstanceData = infoResponse.data
    const wasRunning = instanceData.value?.status === 'RUNNING'
    const isRunning = newInstanceData?.status === 'RUNNING'

    // 检测容器是否重启（从停止到运行）
    const justStarted = !wasRunning && isRunning
    if (justStarted) {
      // 容器刚启动，记录启动时间并清空日志
      containerStartTime = Date.now()
      detailLogs.value = ''
      logCursor.value = null
      console.log('[开机] 检测到容器启动，清空日志，记录启动时间:', containerStartTime)
    } else if (wasRunning && !isRunning) {
      // 容器刚停止
      console.log('[关机] 检测到容器停止')
      containerStartTime = null
    }

    instanceData.value = newInstanceData

    // 只有在容器运行时才获取日志
    // 如果刚启动，强制获取日志；否则只在非实时模式或 WebSocket 未连接时获取
    const shouldFetchLogs = isRunning && (justStarted || !useRealtimeLogs.value || !socketConnected.value)

    if (shouldFetchLogs) {
      const useCursor = !reset && !justStarted && logCursor.value !== null
      const logParams = useCursor ? { since: logCursor.value } : undefined

      console.log('[loadDetail] reset:', reset, 'justStarted:', justStarted, 'isRunning:', isRunning, 'logCursor:', logCursor.value, 'useCursor:', useCursor, 'logParams:', logParams)

      const logsResponse = await instancesAPI.getLogs(props.id, logParams)
      console.log('[loadDetail响应] logs长度:', logsResponse.data?.logs?.length, 'cursor:', logsResponse.data?.cursor)

      const shouldResetLogs = !useCursor
      applyLogsPayload(logsResponse.data, shouldResetLogs)
      scrollConsoleToBottom()
    }
  } catch (error) {
    notifications.error(
      error.response?.data?.message || '获取实例信息失败',
      { title: '实例详情' }
    )
  } finally {
    if (shouldShowLoading) {
      isLoading.value = false
    }
    refreshInFlight = false
  }
}

const refreshAll = () => {
  loadDetail(true)
  if (useRealtimeLogs.value && socketConnected.value) {
    subscribeLogs(true)
  }
}

const refreshLogs = async (reset = false) => {
  // 只有在运行状态下才能刷新日志
  if (!isContainerRunning.value) {
    notifications.info('实例未运行，无法刷新日志', { title: '日志刷新' })
    return
  }

  if (useRealtimeLogs.value && socketConnected.value) {
    subscribeLogs(reset)
    return
  }

  if (reset) {
    logCursor.value = null
  }

  const useCursor = !reset && logCursor.value !== null
  const logParams = useCursor ? { since: logCursor.value } : undefined

  console.log('[刷新] reset:', reset, 'logCursor:', logCursor.value, 'useCursor:', useCursor, 'logParams:', logParams)

  try {
    const response = await instancesAPI.getLogs(props.id, logParams)
    console.log('[刷新响应] logs长度:', response.data?.logs?.length, 'cursor:', response.data?.cursor)

    const shouldResetLogs = !useCursor
    applyLogsPayload(response.data, shouldResetLogs)
    scrollConsoleToBottom()
  } catch (error) {
    notifications.error(
      error.response?.data?.message || '获取日志失败',
      { title: '日志刷新失败' }
    )
  }
}

const clearLogs = () => {
  detailLogs.value = ''
  logCursor.value = null
  notifications.success('控制台已清空', { title: '控制台' })
}

const startAutoRefresh = () => {
  stopAutoRefresh()
  if (!autoRefresh.value) return
  refreshTimer = setInterval(() => {
    loadDetail()
  }, 5000)
}

const stopAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

watch(numericInstanceId, (newId, oldId) => {
  if (Number.isNaN(newId)) {
    return
  }

  logCursor.value = null
  detailLogs.value = ''
  containerStartTime = null

  if (logsSocket && logsSocket.connected) {
    if (!Number.isNaN(oldId) && hasActiveSubscription) {
      logsSocket.emit('unsubscribeLogs', { instanceId: oldId })
    }
    hasActiveSubscription = false
    subscribeLogs(true)
  }
})

watch(useRealtimeLogs, (value) => {
  if (value) {
    autoRefresh.value = false
    stopAutoRefresh()
    connectLogsSocket()
  } else {
    disconnectLogsSocket()
    autoRefresh.value = true
  }
})

watch(autoRefresh, (value) => {
  if (value) {
    loadDetail()
    startAutoRefresh()
  } else {
    stopAutoRefresh()
  }
})

watch(detailLogs, () => {
  scrollConsoleToBottom()
})

const startInstance = async () => {
  if (containerActionLoading.value) return

  containerActionLoading.value = true
  try {
    await instancesAPI.start(props.id)
    notifications.success('实例启动成功')
    // loadDetail会自动检测状态变化并清空日志
    await loadDetail(true)
  } catch (error) {
    notifications.error(
      error.response?.data?.message || '启动失败',
      { title: '启动实例失败' }
    )
  } finally {
    containerActionLoading.value = false
  }
}

const stopInstance = async () => {
  if (containerActionLoading.value) return

  screenOverlayMessage.value = '实例正在关机，请稍候...'
  showScreenOverlay.value = true
  containerActionLoading.value = true
  try {
    await instancesAPI.stop(props.id)
    notifications.success('实例已停止')
    // 停止消息已由后端写入日志，这里只需重新加载
    logCursor.value = null
    await loadDetail(true)
  } catch (error) {
    console.log(error.response)
    notifications.error(
      error.response?.data?.message ,
      { title: '停止实例失败' }
    )
  } finally {
    containerActionLoading.value = false
    showScreenOverlay.value = false
  }
}

const restartInstance = async () => {
  if (!confirm('确定要重启这个实例吗？')) return
  if (containerActionLoading.value) return

  containerActionLoading.value = true
  try {
    await instancesAPI.restart(props.id)
    notifications.success('实例重启成功')
    await loadDetail(true)
  } catch (error) {
    notifications.error(
      error.response?.data?.message || '重启失败',
      { title: '重启实例失败' }
    )
  } finally {
    containerActionLoading.value = false
  }
}

const startServer = async () => {
  if (!instanceData.value || serverActionLoading.value) return
  if (!isContainerRunning.value) {
    notifications.error('容器未运行，无法启动服务器', { title: '启动服务器失败' })
    return
  }

  serverActionLoading.value = true
  try {
    const response = await instancesAPI.startServer(props.id)
    notifications.success(response.data?.message || '服务器启动命令已发送')
    setTimeout(() => {
      refreshLogs()
    }, 1500)
  } catch (error) {
    console.log(error)
    notifications.error(
      error.response?.data?.message || '启动服务器失败',
      { title: '启动服务器失败' }
    )
  } finally {
    serverActionLoading.value = false
  }
}

const stopServer = async () => {
  if (!instanceData.value || serverActionLoading.value) return

  serverActionLoading.value = true
  try {
    const response = await instancesAPI.stopServer(props.id)
    notifications.success(response.data?.message || '服务器停止命令已执行')
    setTimeout(() => {
      refreshLogs()
    }, 1000)
  } catch (error) {
    notifications.error(
      error.response?.data?.message || '停止服务器失败',
      { title: '停止服务器失败' }
    )
  } finally {
    serverActionLoading.value = false
  }
}

const restartServer = async () => {
  if (!instanceData.value || serverActionLoading.value) return

  serverActionLoading.value = true
  try {
    const response = await instancesAPI.restartServer(props.id)
    notifications.success(response.data?.message || '服务器重启命令已发送')
    setTimeout(() => {
      refreshLogs()
    }, 1500)
  } catch (error) {
    notifications.error(
      error.response?.data?.message || '重启服务器失败',
      { title: '重启服务器失败' }
    )
  } finally {
    serverActionLoading.value = false
  }
}
const sendCommand = async () => {
  const command = commandInput.value.trim()
  if (!command) return

  if (useRealtimeLogs.value && logsSocket && socketConnected.value) {
    const timestamp = new Date().toLocaleTimeString()
    appendLogs(`[${timestamp}] > ${command}`)
    scrollConsoleToBottom()

    logsSocket.emit('execCommand', {
      instanceId: numericInstanceId.value,
      command
    })
    commandInput.value = ''
    return
  }

  try {
    const response = await instancesAPI.execCommand(props.id, { command })
    const output = response.data?.output || ''
    const timestamp = new Date().toLocaleTimeString()

    appendLogs(`[${timestamp}] > ${command}\n${output || '(无输出)'}`)
    scrollConsoleToBottom()

    notifications.success(`命令已发送: ${command}`)
    commandInput.value = ''

    setTimeout(() => {
      refreshLogs()
    }, 1000)
  } catch (error) {
    notifications.error(
      error.response?.data?.message || '发送命令失败',
      { title: '命令执行失败' }
    )
  }
}

const goBack = () => {
  router.push({ name: 'MyInstances' })
}

const openCfgEditor = async () => {
  if (!instanceData.value) return

  try {
    // 加载 CFG 模板内容
    cfgTemplateContent.value = ''
    if (instanceData.value.cfgTemplateId) {
      const response = await cfgTemplatesAPI.getOne(instanceData.value.cfgTemplateId)
      cfgTemplateContent.value = response.data.content
    }

    // 加载自定义配置
    customCfgContent.value = instanceData.value.customCfg || ''

    showCfgModal.value = true
  } catch (error) {
    notifications.error(
      error.response?.data?.message || '加载配置失败',
      { title: '打开配置编辑器失败' }
    )
  }
}

const saveCfg = async () => {
  if (!instanceData.value) return

  isSavingCfg.value = true
  try {
    // 更新实例的自定义配置
    await instancesAPI.update(instanceData.value.id, {
      customCfg: customCfgContent.value
    })

    notifications.success('CFG 配置已保存并写入容器')
    showCfgModal.value = false

    // 刷新实例数据
    await loadDetail()
  } catch (error) {
    notifications.error(
      error.response?.data?.message || '保存失败',
      { title: '保存 CFG 配置失败' }
    )
  } finally {
    isSavingCfg.value = false
  }
}

const openStartupViewer = async () => {
  if (!instanceData.value) return

  try {
    // 加载启动项内容
    startupOptionContent.value = ''
    if (instanceData.value.startupOptionId) {
      const response = await startupOptionsAPI.getOne(instanceData.value.startupOptionId)
      startupOptionContent.value = response.data.content
    }

    showStartupModal.value = true
  } catch (error) {
    notifications.error(
      error.response?.data?.message || '加载启动项失败',
      { title: '打开启动项查看器失败' }
    )
  }
}

const getStatusText = (status) => {
  const texts = {
    RUNNING: '运行中',
    STOPPED: '已停止',
    RESTARTING: '重启中',
    ERROR: '错误'
  }
  return texts[status] || status || '未知'
}

const formatDateTime = (value) => {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString()
  } catch (error) {
    return value
  }
}

function formatBytes(bytes) {
  if (!bytes || Number.isNaN(bytes)) {
    return '0 B'
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let index = 0
  let value = bytes
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index++
  }
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`
}

const formatPercentage = (value = 0) => {
  if (!value || Number.isNaN(value)) {
    return '0%'
  }
  return `${value.toFixed(1)}%`
}

function formatDuration(totalSeconds) {
  const seconds = Math.floor(totalSeconds || 0)
  if (seconds <= 0) return '—'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  const parts = []
  if (days) parts.push(`${days}天`)
  if (hours) parts.push(`${hours}小时`)
  if (minutes) parts.push(`${minutes}分钟`)
  if (parts.length === 0) {
    parts.push(`${seconds % 60}秒`)
  }
  return parts.join('')
}

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let index = 0
  let size = bytes
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024
    index++
  }
  return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

const openFileManager = async () => {
  if (!instanceData.value) return

  try {
    currentPath.value = ''
    showFileManagerModal.value = true
    await loadFiles()
  } catch (error) {
    notifications.error(
      error.response?.data?.message || '打开文件管理器失败',
      { title: '文件管理' }
    )
  }
}

const loadFiles = async () => {
  isLoadingFiles.value = true
  try {
    const response = await instancesAPI.listFiles(props.id, currentPath.value)
    fileList.value = response.data.files
  } catch (error) {
    notifications.error(
      error.response?.data?.message || '加载文件列表失败',
      { title: '文件管理' }
    )
  } finally {
    isLoadingFiles.value = false
  }
}

const navigateInto = (dirname) => {
  currentPath.value = currentPath.value ? `${currentPath.value}/${dirname}` : dirname
  loadFiles()
}

const navigateUp = () => {
  const parts = currentPath.value.split('/')
  parts.pop()
  currentPath.value = parts.join('/')
  loadFiles()
}

const handleFileSelect = async (event) => {
  const files = Array.from(event.target.files || [])
  if (files.length === 0) return

  // 检查文件大小
  const maxSize = 10 * 1024 * 1024 // 10MB
  const oversizedFiles = files.filter(f => f.size > maxSize)

  if (oversizedFiles.length > 0) {
    notifications.error(
      `以下文件超过 10MB: ${oversizedFiles.map(f => f.name).join(', ')}`,
      { title: '文件上传' }
    )
    if (fileInput.value) {
      fileInput.value.value = ''
    }
    return
  }

  // 上传文件
  await uploadMultipleFiles(files, false)
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const handleFolderSelect = async (event) => {
  const files = Array.from(event.target.files || [])
  if (files.length === 0) return

  // 检查每个文件大小
  const maxSize = 10 * 1024 * 1024 // 10MB
  const oversizedFiles = files.filter(f => f.size > maxSize)

  if (oversizedFiles.length > 0) {
    notifications.error(
      `以下文件超过 10MB: ${oversizedFiles.map(f => f.name).join(', ')}`,
      { title: '文件上传' }
    )
    if (folderInput.value) {
      folderInput.value.value = ''
    }
    return
  }

  // 上传文件夹
  await uploadMultipleFiles(files, true)
  if (folderInput.value) {
    folderInput.value.value = ''
  }
}

const uploadMultipleFiles = async (files, isFolder) => {
  uploadingFiles.value = files
  uploadProgress.value = 0
  let successCount = 0
  let failCount = 0

  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      try {
        if (isFolder) {
          // 文件夹上传，保持目录结构
          const relativePath = file.webkitRelativePath || file.name
          await instancesAPI.uploadFileToFolder(props.id, currentPath.value, relativePath, file)
        } else {
          // 普通文件上传
          await instancesAPI.uploadFile(props.id, currentPath.value, file)
        }
        successCount++
      } catch (error) {
        console.error(`上传文件 ${file.name} 失败:`, error)
        failCount++
      }

      uploadProgress.value = i + 1
    }

    if (failCount === 0) {
      notifications.success(`成功上传 ${successCount} 个文件`)
    } else {
      notifications.warning(
        `上传完成: 成功 ${successCount} 个, 失败 ${failCount} 个`,
        { title: '文件上传' }
      )
    }

    await loadFiles()
  } catch (error) {
    notifications.error(
      error.response?.data?.message || '文件上传失败',
      { title: '文件上传' }
    )
  } finally {
    uploadingFiles.value = []
    uploadProgress.value = 0
  }
}

// 多选相关
const toggleFileSelection = (file) => {
  const index = selectedFiles.value.findIndex(f => f.name === file.name)
  if (index > -1) {
    selectedFiles.value.splice(index, 1)
  } else {
    selectedFiles.value.push(file)
  }
}

const isFileSelected = (file) => {
  return selectedFiles.value.some(f => f.name === file.name)
}

const clearSelection = () => {
  selectedFiles.value = []
}

// 全选/取消全选
const toggleSelectAll = () => {
  if (selectedFiles.value.length === fileList.value.length) {
    // 当前是全选状态,取消全选
    clearSelection()
  } else {
    // 全选所有文件
    selectedFiles.value = [...fileList.value]
  }
}

// 点击文件卡片 -> 直接打开文件夹或下载文件
const handleFileClick = (file) => {
  if (file.isDirectory) {
    // 点击文件夹 -> 进入文件夹
    navigateInto(file.name)
  } 
}

// 下载单个文件或文件夹
const downloadSingleFile = async (filename, isDirectory) => {
  try {
    const filePath = currentPath.value ? `${currentPath.value}/${filename}` : filename

    if (isDirectory) {
      const response = await instancesAPI.downloadFolder(props.id, filePath)
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${filename}.zip`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      notifications.success('文件夹下载成功')
    } else {
      const response = await instancesAPI.downloadFile(props.id, filePath)
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      notifications.success('文件下载成功')
    }
  } catch (error) {
    notifications.error(
      error.response?.data?.message || '下载失败',
      { title: '下载' }
    )
  }
}

// 下载选中的文件/文件夹
const downloadSelected = async () => {
  if (selectedFiles.value.length === 0) return

  try {
    const paths = selectedFiles.value.map(file =>
      currentPath.value ? `${currentPath.value}/${file.name}` : file.name
    )

    const response = await instancesAPI.downloadMultiple(props.id, paths)
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'files.zip')
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)

    notifications.success(`成功下载 ${selectedFiles.value.length} 项`)
    clearSelection()
  } catch (error) {
    notifications.error(
      error.response?.data?.message || '批量下载失败',
      { title: '下载' }
    )
  }
}

// 删除单个文件或文件夹
const deleteSingleFile = async (filename, isDirectory) => {
  const type = isDirectory ? '文件夹' : '文件'
  if (!confirm(`确定要删除这个${type}吗？${isDirectory ? '文件夹下的所有内容都将被删除。' : ''}`)) return

  try {
    const filePath = currentPath.value ? `${currentPath.value}/${filename}` : filename
    await instancesAPI.deleteFile(props.id, filePath)
    notifications.success(`${type}删除成功`)
    await loadFiles()
  } catch (error) {
    notifications.error(
      error.response?.data?.message || `${type}删除失败`,
      { title: '删除' }
    )
  }
}

// 删除选中的文件/文件夹
const deleteSelected = async () => {
  if (selectedFiles.value.length === 0) return

  if (!confirm(`确定要删除选中的 ${selectedFiles.value.length} 项吗？此操作不可恢复。`)) return

  let successCount = 0
  let failCount = 0

  for (const file of selectedFiles.value) {
    try {
      const filePath = currentPath.value ? `${currentPath.value}/${file.name}` : file.name
      await instancesAPI.deleteFile(props.id, filePath)
      successCount++
    } catch (error) {
      console.error(`删除文件 ${file.name} 失败:`, error)
      failCount++
    }
  }

  if (failCount === 0) {
    notifications.success(`成功删除 ${successCount} 项`)
  } else {
    notifications.warning(
      `删除完成: 成功 ${successCount} 项, 失败 ${failCount} 项`,
      { title: '批量删除' }
    )
  }

  clearSelection()
  await loadFiles()
}

// 打开同步日志对话框
const openSyncLogsDialog = async () => {
  if (!instanceData.value?.gamemodeName) {
    notifications.warning('此实例未关联游戏模式')
    return
  }
  showSyncLogsDialog.value = true
  await loadSyncLogs()
}

// 加载同步日志
const loadSyncLogs = async (page = 1) => {
  if (!instanceData.value?.gamemodeName) return

  loadingSyncLogs.value = true
  try {
    const response = await syncAPI.getSyncLogs({
      page,
      limit: 20,
      gamemodeName: instanceData.value.gamemodeName
    })
    syncLogs.value = response.data.logs
    syncLogsTotal.value = response.data.total
    syncLogsTotalPages.value = response.data.totalPages
    syncLogsCurrentPage.value = page
  } catch (error) {
    notifications.error(
      error.response?.data?.message || '加载同步日志失败',
      { title: '同步日志' }
    )
  } finally {
    loadingSyncLogs.value = false
  }
}

// 触发模式同步
const triggerModeSync = async () => {
  if (!instanceData.value?.gamemodeName) return

  syncLoading.value = true
  try {
    await syncAPI.manualSync(instanceData.value.gamemodeName)
    notifications.success('同步任务已加入队列，请稍后查看日志', { title: '同步' })
    // 3秒后刷新日志
    setTimeout(() => {
      loadSyncLogs(syncLogsCurrentPage.value)
    }, 3000)
  } catch (error) {
    notifications.error(
      error.response?.data?.message || '触发同步失败',
      { title: '同步' }
    )
  } finally {
    syncLoading.value = false
  }
}

// 切换错误详情显示
const toggleErrorDetails = (logId) => {
  if (expandedErrors.value.has(logId)) {
    expandedErrors.value.delete(logId)
  } else {
    expandedErrors.value.add(logId)
  }
}

// 获取同步状态文本
const getSyncStatusText = (status) => {
  const statusMap = {
    success: '成功',
    failed: '失败',
    in_progress: '进行中'
  }
  return statusMap[status] || status
}

// 格式化同步日期
const formatSyncDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

onMounted(() => {
  if (useRealtimeLogs.value) {
    connectLogsSocket()
  }
  loadDetail()
  if (!useRealtimeLogs.value && autoRefresh.value) {
    startAutoRefresh()
  }
})

onBeforeUnmount(() => {
  stopAutoRefresh()
  disconnectLogsSocket()
})
</script>

<style scoped>
.scroll-sleek {
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.5) transparent;
}

.scroll-sleek::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.scroll-sleek::-webkit-scrollbar-track {
  background: transparent;
}

.scroll-sleek::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(96, 165, 250, 0.55), rgba(14, 165, 233, 0.55));
  border-radius: 9999px;
  border: 2px solid rgba(15, 23, 42, 0.4);
  transition: background 0.2s ease;
}

.scroll-sleek::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, rgba(59, 130, 246, 0.8), rgba(14, 165, 233, 0.8));
}

.card-enter-from {
  opacity: 0;
  transform: translateY(16px) scale(0.96);
}

.card-enter-active {
  transition: all 0.35s cubic-bezier(0.22, 0.61, 0.36, 1);
}

.card-leave-active {
  transition: all 0.25s ease;
  opacity: 0;
  transform: translateY(-12px) scale(0.96);
}
</style>
