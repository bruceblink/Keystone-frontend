<script setup lang="ts">
import { ref } from "vue";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import Delete from "@iconify-icons/ep/delete";
import Refresh from "@iconify-icons/ep/refresh";
import Search from "@iconify-icons/ep/search";
import Upload from "@iconify-icons/ep/upload";
import { getProgressStatus } from "./utils/dict";
import { useUpdateList } from "./utils";
import BatchUpdate from "./components/BatchUpdate.vue";
import type { UpdateRecord } from "./utils/types";

defineOptions({ name: "BoatSoftware" });

const {
  getDeviceGroup,
  searchQuery,
  statusFilter,
  getStatusCount,
  pagination,
  dataList,
  onSearch,
  multipleSelection,
  columns,
  handleRefresh,
  handleDelete,
  handleBatchDelete,
  addUpdateRecords
} = useUpdateList();

const batchVisible = ref(false);

const handleBatchSubmitted = (records: UpdateRecord[]) => {
  addUpdateRecords(records);
  batchVisible.value = false;
};

defineExpose({ addUpdateRecords });

const STATUS_TABS = [
  { key: "all", label: "全部", dot: "#909399" },
  { key: "0", label: "未下载", dot: "#909399" },
  { key: "1", label: "下载中", dot: "#409eff" },
  { key: "2", label: "下载完成", dot: "#67c23a" }
];

const STATUS_DOT: Record<string, string> = {
  "0": "#909399",
  "1": "#409eff",
  "2": "#67c23a"
};
const STATUS_LABEL: Record<string, string> = {
  "0": "未下载",
  "1": "下载中",
  "2": "下载完成"
};
</script>

<template>
  <div class="update-list-wrap">
    <!-- 搜索栏 -->
    <el-form inline class="search-form bg-bg_color w-[99/100] pl-8 pt-[12px]">
      <el-form-item>
        <el-input
          v-model="searchQuery"
          placeholder="设备编号 / 名称 / 软件 / 分组"
          clearable
          class="!w-[280px]"
          @input="onSearch"
        >
          <template #prefix>
            <el-icon><component :is="useRenderIcon(Search)" /></el-icon>
          </template>
        </el-input>
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          :icon="useRenderIcon(Upload)"
          @click="batchVisible = true"
        >
          批量更新
        </el-button>
        <el-button
          type="primary"
          plain
          :icon="useRenderIcon(Refresh)"
          @click="handleRefresh"
        >
          刷新
        </el-button>
        <el-button
          type="danger"
          plain
          :icon="useRenderIcon(Delete)"
          :disabled="!multipleSelection.length"
          @click="handleBatchDelete"
        >
          批量删除
        </el-button>
      </el-form-item>
    </el-form>

    <!-- 批量更新弹窗 -->
    <el-dialog
      v-model="batchVisible"
      title="批量更新"
      width="860px"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <BatchUpdate @submitted="handleBatchSubmitted" />
    </el-dialog>

    <!-- 状态筛选 tab 栏 -->
    <div class="status-tab-bar">
      <div
        v-for="tab in STATUS_TABS"
        :key="tab.key"
        class="status-tab"
        :class="{ 'is-active': statusFilter === tab.key }"
        @click="
          statusFilter = tab.key;
          onSearch();
        "
      >
        <span class="tab-dot" :style="{ background: tab.dot }" />
        <span class="tab-label">{{ tab.label }}</span>
        <span class="tab-badge">{{ getStatusCount(tab.key) }}</span>
      </div>
    </div>

    <!-- 表格 -->
    <PureTableBar
      title="更新任务列表"
      :columns="columns"
      @refresh="handleRefresh"
    >
      <template v-slot="{ size, dynamicColumns }">
        <pure-table
          border
          align-whole="center"
          show-overflow-tooltip
          table-layout="auto"
          :size="size"
          :max-height="840"
          :data="dataList"
          :columns="dynamicColumns"
          :pagination="pagination"
          :paginationSmall="size === 'small'"
          :header-cell-style="{
            background: 'var(--el-table-row-hover-bg-color)',
            color: 'var(--el-text-color-primary)'
          }"
          @page-size-change="
            v => {
              pagination.pageSize = v;
              onSearch();
            }
          "
          @page-current-change="v => (pagination.currentPage = v)"
          @selection-change="(rows: UpdateRecord[]) => (multipleSelection = rows)"
        >
          <template #group="{ row }">
            {{ getDeviceGroup(row.devid) }}
          </template>

          <template #status="{ row }">
            <span class="dot-status">
              <span
                class="dot-circle"
                :style="{ background: STATUS_DOT[row.status] ?? '#909399' }"
              />
              {{ STATUS_LABEL[row.status] ?? "未知" }}
            </span>
          </template>

          <template #progress="{ row }">
            <div class="progress-wrap">
              <el-progress
                :percentage="parseFloat(row.progress) || 0"
                :status="getProgressStatus(row.status)"
                :stroke-width="8"
                :show-text="false"
                class="progress-bar"
              />
              <span class="progress-text">
                {{ (parseFloat(row.progress) || 0).toFixed(1) }}%
              </span>
            </div>
          </template>

          <template #operation="{ row }">
            <el-popconfirm
              :title="`确认删除 ${row.shipname_cn} 的任务？`"
              @confirm="handleDelete(row)"
            >
              <template #reference>
                <el-button
                  link
                  type="danger"
                  :size="size"
                  :icon="useRenderIcon(Delete)"
                >
                  删除
                </el-button>
              </template>
            </el-popconfirm>
          </template>
        </pure-table>
      </template>
    </PureTableBar>
  </div>
</template>

<style scoped lang="scss">
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }

  50% {
    opacity: 0.5;
    transform: scale(0.8);
  }
}

.update-list-wrap {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.search-form {
  :deep(.el-form-item) {
    margin-bottom: 12px;
  }
}

/* ===== 状态 tab 栏 ===== */
.status-tab-bar {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px 32px 12px;
}

.status-tab {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 5px 14px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  cursor: pointer;
  user-select: none;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 20px;
  transition: all 0.2s;

  &:hover {
    color: var(--el-color-primary);
    border-color: var(--el-color-primary-light-5);
  }

  &.is-active {
    font-weight: 600;
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary);

    .tab-badge {
      color: #fff;
      background: var(--el-color-primary);
    }
  }
}

.tab-dot {
  display: inline-block;
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.tab-label {
  line-height: 1;
}

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-darker);
  border-radius: 9px;
  transition: all 0.2s;
}

/* ===== 状态 dot ===== */
.dot-status {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  font-size: 13px;
}

.dot-circle {
  display: inline-block;
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: none;
}

/* 下载中的圆点加呼吸动画 */
:deep(.dot-circle[style*="409eff"]) {
  animation: pulse 1.5s ease-in-out infinite;
}

/* ===== 进度条 ===== */
.progress-wrap {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;

  .progress-bar {
    flex: 1;
    min-width: 60px;
  }

  .progress-text {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    white-space: nowrap;
  }
}
</style>
