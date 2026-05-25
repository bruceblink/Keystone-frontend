<script setup lang="ts">
import {
  Monitor,
  Download,
  CopyDocument,
  Loading
} from "@element-plus/icons-vue";

interface Props {
  outputLines: string[];
  isExecuting: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  export: [];
  copy: [];
  fillQuickCommand: [cmd: string];
  getLineClass: [line: string];
}>();

function getLineClass(line: string): string {
  if (line.startsWith("执行命令：")) return "cmd-line--command";
  if (/error|Error|ERROR/.test(line)) return "cmd-line--error";
  if (/warning|Warning|WARNING/.test(line)) return "cmd-line--warning";
  if (/success|Success|SUCCESS/.test(line)) return "cmd-line--success";
  return "cmd-line--output";
}

const quickCmds = ["ls -la", "ps aux", "df -h", "netstat -tulpn"];
</script>

<template>
  <el-card
    class="output-panel"
    shadow="never"
    :header-style="{ padding: '10px 32px' }"
  >
    <template #header>
      <div class="panel-header">
        <div class="panel-title">
          <el-icon :size="16"><Monitor /></el-icon>
          <span>指令交互</span>
        </div>
        <div class="panel-actions">
          <el-button size="small" :icon="Download" @click="emit('export')"
            >导出</el-button
          >
          <el-button size="small" :icon="CopyDocument" @click="emit('copy')"
            >复制</el-button
          >
        </div>
      </div>
    </template>

    <div class="output-body">
      <!-- 空态 -->
      <div v-if="outputLines.length === 0" class="output-empty">
        <el-icon :size="40"><Monitor /></el-icon>
        <p class="empty-tip">等待指令执行结果...</p>
        <p class="empty-sub">常用命令</p>
        <div class="quick-list">
          <el-tag
            v-for="cmd in quickCmds"
            :key="cmd"
            class="quick-tag"
            effect="plain"
            @click="emit('fillQuickCommand', cmd)"
          >
            {{ cmd }}
          </el-tag>
        </div>
      </div>

      <!-- 输出行 -->
      <template v-else>
        <div
          v-for="(line, idx) in outputLines"
          :key="idx"
          class="cmd-line"
          :class="getLineClass(line)"
        >
          <span class="line-num">{{ idx + 1 }}</span>
          <span class="line-text">{{ line }}</span>
        </div>
        <div v-if="isExecuting" class="executing-row">
          <el-icon class="spin-icon"><Loading /></el-icon>
          正在执行命令...
        </div>
      </template>
    </div>
  </el-card>
</template>

<style scoped lang="scss">
.output-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;

  :deep(.el-card__header) {
    background: var(--el-fill-color-light);
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  :deep(.el-card__body) {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    padding: 0;
    overflow: hidden;
  }
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-title {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.panel-actions {
  display: flex;
  gap: 8px;
}

.output-body {
  flex: 1;
  min-height: 0;
  padding: 12px;
  overflow-y: auto;
  font-family: "JetBrains Mono", "Fira Code", "Courier New", monospace;
  background: var(--el-fill-color-blank);

  &::-webkit-scrollbar {
    width: 5px;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--el-border-color);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }
}

.output-empty {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--el-text-color-placeholder);

  .el-icon {
    opacity: 0.7;
  }
}

.empty-tip {
  margin: 0;
  font-family: sans-serif;
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.empty-sub {
  margin: 0;
  font-family: sans-serif;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.quick-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.quick-tag {
  font-family: "Courier New", monospace;
  font-size: 12px;
  cursor: pointer;

  &:hover {
    opacity: 0.8;
  }
}

.cmd-line {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 7px 10px;
  margin-bottom: 6px;
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--el-text-color-primary);
  border-left: 3px solid transparent;
  border-radius: 6px;

  &--command {
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    border-left-color: var(--el-color-primary);
  }

  &--error {
    color: var(--el-color-danger);
    background: var(--el-color-danger-light-9);
    border-left-color: var(--el-color-danger);
  }

  &--warning {
    color: var(--el-color-warning);
    background: var(--el-color-warning-light-9);
    border-left-color: var(--el-color-warning);
  }

  &--success {
    color: var(--el-color-success);
    background: var(--el-color-success-light-9);
    border-left-color: var(--el-color-success);
  }

  &--output {
    color: var(--el-text-color-regular);
    background: var(--el-fill-color-light);
    border-left-color: var(--el-border-color);
  }
}

.line-num {
  flex-shrink: 0;
  width: 28px;
  font-size: 11px;
  color: var(--el-text-color-placeholder);
  text-align: right;
  user-select: none;
}

.line-text {
  flex: 1;
  min-width: 0;
  word-break: break-word;
  white-space: pre-wrap;
}

.executing-row {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  padding: 8px 12px;
  margin-top: 8px;
  font-family: sans-serif;
  font-size: 12.5px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-7);
  border-radius: 6px;
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
