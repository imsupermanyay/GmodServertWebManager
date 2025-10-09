<template>
  <el-config-provider :locale="zhCn">
    <router-view />
  </el-config-provider>
</template>

<script setup lang="ts">
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body {
  width: 100%;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
    sans-serif;
  background-color: #0a0a0a;
  color: #ffffff;
}

#app {
  width: 100%;
  height: 100%;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background-color: #1f1f1f;
}

::-webkit-scrollbar-thumb {
  background-color: #3d3d3d;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background-color: #4d4d4d;
}

/* Element Plus 深色主题样式覆盖 */
.el-button {
  font-weight: 500;
}

.el-card {
  background-color: #1f1f1f;
  border: 1px solid #2d2d2d;
  color: #ffffff;
}

.el-card__header {
  background-color: #2d2d2d;
  border-bottom: 1px solid #3d3d3d;
  color: #ffffff;
}

.el-dialog {
  background-color: #1f1f1f;
  border: 1px solid #2d2d2d;
}

.el-dialog__header {
  background-color: #2d2d2d;
  border-bottom: 1px solid #3d3d3d;
}

.el-dialog__title {
  color: #ffffff;
}

.el-dialog__body {
  background-color: #1f1f1f;
  color: #ffffff;
}

.el-form-item__label {
  color: #ffffff;
}

.el-input__wrapper {
  background-color: #2d2d2d;
  box-shadow: 0 0 0 1px #3d3d3d inset;
}

.el-input__inner {
  color: #ffffff;
  background-color: transparent;
}

.el-input__inner::placeholder {
  color: #606266;
}

.el-select .el-input__wrapper {
  background-color: #2d2d2d;
}

.el-textarea__inner {
  background-color: #2d2d2d;
  color: #ffffff;
  box-shadow: 0 0 0 1px #3d3d3d inset;
}

.el-select-dropdown {
  background-color: #2d2d2d;
  border: 1px solid #3d3d3d;
}

.el-select-dropdown__item {
  color: #ffffff;
}

.el-select-dropdown__item:hover {
  background-color: #3d3d3d;
}

.el-select-dropdown__item.selected {
  color: #409eff;
  font-weight: 600;
}

.el-picker-panel {
  background-color: #2d2d2d;
  border: 1px solid #3d3d3d;
  color: #ffffff;
}

.el-date-picker__header-label {
  color: #ffffff;
}

.el-date-table td.available:hover {
  color: #409eff;
}

.el-date-table td.current:not(.disabled) span {
  background-color: #409eff;
  color: #ffffff;
}

.el-popper {
  background-color: #2d2d2d !important;
  border: 1px solid #3d3d3d !important;
}

.el-popper .el-popper__arrow::before {
  background-color: #2d2d2d;
  border: 1px solid #3d3d3d;
}

.el-dropdown-menu {
  background-color: #2d2d2d;
  border: 1px solid #3d3d3d;
}

.el-dropdown-menu__item {
  color: #ffffff;
}

.el-dropdown-menu__item:hover {
  background-color: #3d3d3d;
  color: #409eff;
}

.el-message-box {
  background-color: #1f1f1f;
  border: 1px solid #2d2d2d;
}

.el-message-box__header {
  background-color: #2d2d2d;
  border-bottom: 1px solid #3d3d3d;
}

.el-message-box__title {
  color: #ffffff;
}

.el-message-box__content {
  color: #ffffff;
}

.el-pagination {
  color: #ffffff;
}

.el-pagination button {
  background-color: #2d2d2d;
  color: #ffffff;
}

.el-pagination button:disabled {
  background-color: #1f1f1f;
  color: #606266;
}

.el-pager li {
  background-color: #2d2d2d;
  color: #ffffff;
}

.el-pager li.active {
  background-color: #409eff;
  color: #ffffff;
}

.el-pager li:hover {
  color: #409eff;
}

.el-empty__description p {
  color: #909399;
}

.el-timeline-item__timestamp {
  color: #909399;
}
</style>
