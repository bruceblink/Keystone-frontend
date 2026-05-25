<script setup lang="ts">
import { Promotion, Setting, Monitor } from "@element-plus/icons-vue";

interface Props {
  userInput: string;
  commandInput: string;
  isExecuting: boolean;
  disableSend: boolean;
  showSuggestions: boolean;
  filteredSuggestions: string[];
  selectedSuggestionIndex: number;
  waitTime: number;
  serviceType: "aiservice" | "sync_service";
  showSettingsDialog: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  "update:userInput": [val: string];
  "update:waitTime": [val: number];
  "update:serviceType": [val: "aiservice" | "sync_service"];
  "update:showSettingsDialog": [val: boolean];
  send: [];
  clearPrefix: [];
  switchToDetectPath: [];
  switchToSyncPath: [];
  handleUserInput: [];
  handleBlur: [];
  navigateHistoryUp: [];
  navigateHistoryDown: [];
  handleTabCompletion: [];
  selectSuggestion: [s: string];
  confirmSettings: [];
}>();
</script>

<template>
  <el-card
    class="cmd-input-card"
    shadow="never"
    :body-style="{ padding: '12px 32px' }"
  >
    <div class="input-wrap">
      <!-- 快捷路径按钮 -->
      <div class="shortcut-row">
        <el-button size="small" type="info" plain @click="emit('clearPrefix')"
          >根目录</el-button
        >
        <el-button
          size="small"
          type="primary"
          plain
          @click="emit('switchToDetectPath')"
          >检测软件</el-button
        >
        <el-button
          size="small"
          type="warning"
          plain
          @click="emit('switchToSyncPath')"
          >同步软件</el-button
        >
        <span class="hint-text">
          <el-icon><Promotion /></el-icon>
          Ctrl+Enter 发送 · ↑↓ 浏览历史 · Tab 补全
        </span>
      </div>

      <!-- 建议浮层 -->
      <div
        v-if="showSuggestions && filteredSuggestions.length > 0"
        class="suggestions-box"
      >
        <div
          v-for="(s, i) in filteredSuggestions"
          :key="i"
          class="suggestion-item"
          :class="{ 'is-active': i === selectedSuggestionIndex }"
          @mousedown.prevent="emit('selectSuggestion', s)"
        >
          <el-icon size="12"><Monitor /></el-icon>
          <span>{{ s }}</span>
        </div>
      </div>

      <!-- 主输入行 -->
      <div class="main-row">
        <!-- 输入框 + 设置按钮共用一个带边框容器 -->
        <div class="input-box">
          <el-input
            :model-value="userInput"
            type="textarea"
            :rows="3"
            placeholder="请输入指令..."
            class="cmd-textarea"
            @update:model-value="emit('update:userInput', $event)"
            @input="emit('handleUserInput')"
            @focus="emit('update:showSettingsDialog', false)"
            @blur="emit('handleBlur')"
            @keyup.enter="emit('send')"
            @keyup.up="emit('navigateHistoryUp')"
            @keyup.down="emit('navigateHistoryDown')"
            @keyup.tab.prevent="emit('handleTabCompletion')"
          />
          <el-divider direction="vertical" class="box-divider" />
          <el-tooltip content="执行设置" placement="top">
            <button
              class="setting-btn"
              type="button"
              @click="emit('update:showSettingsDialog', true)"
            >
              <el-icon :size="18"><Setting /></el-icon>
            </button>
          </el-tooltip>
        </div>

        <el-button
          type="primary"
          class="send-btn"
          :loading="isExecuting"
          :disabled="disableSend"
          @click="emit('send')"
        >
          <el-icon v-if="!isExecuting"><Promotion /></el-icon>
          {{ isExecuting ? "执行中..." : "发送" }}
        </el-button>
      </div>
    </div>
  </el-card>

  <!-- 设置对话框 -->
  <el-dialog
    :model-value="showSettingsDialog"
    title="命令执行设置"
    width="420px"
    :close-on-click-modal="false"
    @update:model-value="emit('update:showSettingsDialog', $event)"
  >
    <div class="settings-body">
      <el-form label-width="80px" label-position="left">
        <el-form-item label="等待时间">
          <el-input-number
            :model-value="waitTime"
            :min="10"
            :max="300"
            :step="10"
            controls-position="right"
            style="width: 140px"
            @update:model-value="emit('update:waitTime', $event)"
          />
          <span class="unit">秒</span>
        </el-form-item>
        <el-form-item label="服务类型">
          <el-select
            :model-value="serviceType"
            style="width: 180px"
            @update:model-value="emit('update:serviceType', $event)"
          >
            <el-option label="aiservice" value="aiservice" />
            <el-option label="sync_service" value="sync_service" />
          </el-select>
        </el-form-item>
      </el-form>
    </div>
    <template #footer>
      <el-button @click="emit('update:showSettingsDialog', false)"
        >取消</el-button
      >
      <el-button type="primary" @click="emit('confirmSettings')"
        >确定</el-button
      >
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.cmd-input-card {
  flex-shrink: 0;

  :deep(.el-card__body) {
    padding: 12px 16px;
  }
}

.input-wrap {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.shortcut-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.hint-text {
  display: flex;
  gap: 4px;
  align-items: center;
  margin-left: auto;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.suggestions-box {
  position: absolute;
  right: 80px;
  bottom: calc(100% + 4px);
  left: 0;
  z-index: 20;
  max-height: 180px;
  overflow-y: auto;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  box-shadow: var(--el-box-shadow-light);
}

.suggestion-item {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 9px 12px;
  font-family: "Courier New", monospace;
  font-size: 13px;
  color: var(--el-text-color-regular);
  cursor: pointer;
  border-bottom: 1px solid var(--el-border-color-lighter);
  transition: background 0.15s;

  &:last-child {
    border-bottom: none;
  }

  &:hover,
  &.is-active {
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }
}

.main-row {
  display: flex;
  gap: 10px;
  align-items: stretch;
}

// 输入框 + 设置按钮共用容器
.input-box {
  display: flex;
  flex: 1;
  align-items: stretch;
  overflow: hidden;
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  transition: border-color 0.2s;

  &:focus-within {
    border-color: var(--el-color-primary);
  }
}

.box-divider {
  flex-shrink: 0;
  height: auto !important;
  margin: 0;
  border-color: var(--el-border-color) !important;
}

.cmd-textarea {
  flex: 1;

  :deep(.el-textarea__inner) {
    font-family: "JetBrains Mono", "Fira Code", "Courier New", monospace;
    font-size: 13px;
    line-height: 1.6;
    color: var(--el-text-color-primary);
    resize: none;
    background: var(--el-fill-color-blank);
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;

    &::placeholder {
      color: var(--el-text-color-placeholder);
    }
  }
}

.setting-btn {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 48px;
  color: var(--el-text-color-secondary);
  cursor: pointer;
  background: var(--el-fill-color-light);
  border: none;
  transition: background 0.2s, color 0.2s;

  &:hover {
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }
}

.send-btn {
  flex-shrink: 0;
  align-self: stretch;
  min-width: 88px;
  height: auto;
  font-size: 15px;
  font-weight: 600;
  border-radius: var(--el-border-radius-base) !important;
}

.settings-body {
  padding: 8px 0 4px;
}

.unit {
  margin-left: 8px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
</style>
