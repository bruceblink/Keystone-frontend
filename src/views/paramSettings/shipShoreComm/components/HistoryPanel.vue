<script setup lang="ts">
import {
  Clock,
  Download,
  CopyDocument,
  CircleCheck,
  CircleClose,
  CircleCheckFilled,
  Refresh,
  ArrowUp,
  ArrowDown,
  Delete
} from "@element-plus/icons-vue";
import type { HistoryItem } from "../utils/types";

defineProps<{
  commandHistory: HistoryItem[];
}>();

const emit = defineEmits<{
  clearHistory: [];
  exportHistory: [];
  copyHistory: [];
  fillCommand: [cmd: string];
  reExecute: [cmd: string];
  toggleResult: [index: number];
  copyToClipboard: [text: string];
}>();

const STATUS_TEXT: Record<string, string> = {
  success: "成功",
  error: "失败",
  timeout: "超时",
  executing: "执行中"
};

function getStatusText(s: string) {
  return STATUS_TEXT[s] ?? "未知";
}
</script>

<template>
  <el-card
    class="history-panel"
    shadow="never"
    :header-style="{ padding: '10px 16px' }"
  >
    <template #header>
      <div class="panel-header">
        <div class="panel-title">
          <el-icon :size="16"><Clock /></el-icon>
          <span>历史记录</span>
          <el-tag
            v-if="commandHistory.length"
            size="small"
            type="info"
            class="count-tag"
          >
            {{ commandHistory.length }}
          </el-tag>
        </div>
        <div class="panel-actions">
          <el-tooltip content="清空历史">
            <el-button
              size="small"
              :icon="Delete"
              circle
              @click="emit('clearHistory')"
            />
          </el-tooltip>
          <el-button
            size="small"
            :icon="Download"
            @click="emit('exportHistory')"
            >导出</el-button
          >
          <el-button
            size="small"
            :icon="CopyDocument"
            @click="emit('copyHistory')"
            >复制</el-button
          >
        </div>
      </div>
    </template>

    <div class="history-body">
      <el-empty
        v-if="commandHistory.length === 0"
        :image-size="60"
        description="暂无历史记录"
      />

      <template v-else>
        <div
          v-for="(item, index) in commandHistory"
          :key="index"
          class="history-item"
        >
          <!-- 头部：时间 + 状态 -->
          <div class="item-header" @click="emit('fillCommand', item.command)">
            <span class="item-time">{{ item.time }}</span>
            <el-tag
              :type="
                item.status === 'success'
                  ? 'success'
                  : item.status === 'timeout'
                  ? 'warning'
                  : 'danger'
              "
              size="small"
              class="status-tag"
            >
              <el-icon v-if="item.status === 'success'"
                ><CircleCheck
              /></el-icon>
              <el-icon v-else-if="item.status === 'error'"
                ><CircleClose
              /></el-icon>
              <el-icon v-else><CircleCheckFilled /></el-icon>
              {{ getStatusText(item.status) }}
            </el-tag>
          </div>

          <!-- 指令内容 -->
          <div class="item-command" @click="emit('fillCommand', item.command)">
            {{ item.command }}
          </div>

          <!-- 结果展开 -->
          <div v-if="item.showResult" class="item-result">
            <div class="result-header">
              <span class="result-label">执行结果</span>
              <el-button
                size="small"
                link
                @click.stop="emit('toggleResult', index)"
              >
                <el-icon><ArrowUp /></el-icon>收起
              </el-button>
              <el-button
                size="small"
                link
                @click.stop="
                  emit('copyToClipboard', item.resultLines.join('\n'))
                "
              >
                <el-icon><CopyDocument /></el-icon>复制
              </el-button>
            </div>
            <div class="result-lines">
              <div
                v-for="(line, li) in item.resultLines"
                :key="li"
                class="result-line"
              >
                {{ line }}
              </div>
            </div>
          </div>

          <!-- 操作行 -->
          <div class="item-actions">
            <el-button
              v-if="!item.showResult"
              size="small"
              link
              type="primary"
              @click.stop="emit('toggleResult', index)"
            >
              <el-icon><ArrowDown /></el-icon>查看结果
            </el-button>
            <el-button
              size="small"
              link
              @click.stop="emit('reExecute', item.command)"
            >
              <el-icon><Refresh /></el-icon>重新执行
            </el-button>
            <el-button
              size="small"
              link
              @click.stop="emit('copyToClipboard', item.command)"
            >
              <el-icon><CopyDocument /></el-icon>复制
            </el-button>
          </div>
        </div>
      </template>
    </div>
  </el-card>
</template>

<style scoped lang="scss">
.history-panel {
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

.count-tag {
  font-size: 11px;
}

.panel-actions {
  display: flex;
  gap: 6px;
  align-items: center;
}

.history-body {
  flex: 1;
  min-height: 0;
  padding: 10px;
  overflow-y: auto;

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

.history-item {
  padding: 10px 12px;
  margin-bottom: 8px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:hover {
    border-color: var(--el-color-primary-light-5);
    box-shadow: 0 2px 8px rgb(64 158 255 / 8%);
  }

  &:last-child {
    margin-bottom: 0;
  }
}

.item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  cursor: pointer;
}

.item-time {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.status-tag {
  display: inline-flex;
  gap: 3px;
  align-items: center;
  font-size: 12px;
}

.item-command {
  font-family: "JetBrains Mono", "Courier New", monospace;
  font-size: 13px;
  line-height: 1.5;
  color: var(--el-text-color-primary);
  word-break: break-all;
  cursor: pointer;

  &:hover {
    color: var(--el-color-primary);
  }
}

.item-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  margin-top: 6px;
}

.item-result {
  margin-top: 8px;
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
}

.result-header {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 6px 10px;
  background: var(--el-fill-color-light);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.result-label {
  flex: 1;
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-regular);
}

.result-lines {
  max-height: 180px;
  padding: 8px;
  overflow-y: auto;
  background: var(--el-fill-color-blank);

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--el-border-color);
    border-radius: 4px;
  }
}

.result-line {
  padding: 3px 6px;
  margin-bottom: 3px;
  font-family: "JetBrains Mono", "Courier New", monospace;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-regular);
  word-break: break-all;
  white-space: pre-wrap;
  user-select: text;
  border-left: 2px solid var(--el-color-primary-light-5);

  &:last-child {
    margin-bottom: 0;
  }
}
</style>
