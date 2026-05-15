<script setup lang="ts">
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import Search from "@iconify-icons/ep/search";
import Refresh from "@iconify-icons/ep/refresh";
import Delete from "@iconify-icons/ep/delete";
import EditPen from "@iconify-icons/ep/edit-pen";
import { useVersionList } from "../utils";
import { formatFileSize } from "../utils/dict";
import type { VersionItem } from "../utils/types";
import EditVersionDialog from "./EditVersionDialog.vue";

const {
  searchQuery,
  refreshing,
  deletingUuid,
  filteredVersionList,
  handleRefreshList,
  handleDeleteVersion,
  editVisible,
  editForm,
  editRules,
  handleEditVersion,
  submitEdit,
  addToList
} = useVersionList();

function addVersion(
  payload: Omit<VersionItem, "uuid" | "create_time">,
  filename: string,
  fileSize: number
) {
  const norm = (v: string) => (v.startsWith("v") ? v.slice(1) : v);
  const dup = filteredVersionList.value.some(
    item =>
      item.ver_name === payload.ver_name &&
      norm(item.version) === norm(payload.version)
  );
  if (dup) return false;
  addToList(payload, filename, fileSize);
  return true;
}

defineExpose({ addVersion });
</script>

<template>
  <div class="version-list">
    <div class="panel-header">
      <span class="panel-dot panel-dot--green" />
      <span class="panel-title">已存在的版本</span>
      <el-tag type="info" size="small" round class="count-badge">
        {{ filteredVersionList.length }}
      </el-tag>
    </div>

    <div class="list-toolbar">
      <el-input
        v-model="searchQuery"
        placeholder="搜索软件名称、版本号、路径、说明"
        clearable
        class="!w-[260px]"
      >
        <template #prefix>
          <el-icon>
            <component :is="useRenderIcon(Search)" />
          </el-icon>
        </template>
      </el-input>
      <el-button
        :icon="useRenderIcon(Refresh)"
        :loading="refreshing"
        @click="handleRefreshList"
      >
        刷新
      </el-button>
    </div>

    <div class="list-body">
      <el-empty v-if="!filteredVersionList.length" description="暂无版本信息" />
      <el-table
        v-else
        :data="filteredVersionList"
        size="default"
        :header-cell-style="{
          background: 'var(--el-table-row-hover-bg-color)',
          color: 'var(--el-text-color-primary)',
          fontWeight: '600'
        }"
        show-overflow-tooltip
        stripe
      >
        <el-table-column prop="ver_name" label="软件名称" min-width="90" />
        <el-table-column label="版本号" width="88">
          <template #default="{ row }">
            <el-tag type="primary" size="small" round>
              {{ row.version }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="client_path"
          label="存储路径"
          min-width="110"
          show-overflow-tooltip
        />
        <el-table-column
          prop="ver_des"
          label="发布说明"
          min-width="140"
          show-overflow-tooltip
        />
        <el-table-column label="文件大小" width="90">
          <template #default="{ row }">
            {{
              row.size ? formatFileSize(Number(row.size) * 1024 * 1024) : "-"
            }}
          </template>
        </el-table-column>
        <el-table-column prop="create_time" label="发布时间" width="148" />
        <el-table-column label="操作" width="130" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              size="small"
              :icon="useRenderIcon(EditPen)"
              @click="handleEditVersion(row)"
            >
              编辑
            </el-button>
            <el-button
              link
              type="danger"
              size="small"
              :icon="useRenderIcon(Delete)"
              :loading="deletingUuid === row.uuid"
              @click="handleDeleteVersion(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <EditVersionDialog
      v-model:visible="editVisible"
      v-model:form="editForm"
      :rules="editRules"
      @submit="submitEdit"
    />
  </div>
</template>

<style scoped lang="scss">
.version-list {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.panel-header {
  display: flex;
  flex-shrink: 0;
  gap: 10px;
  align-items: center;
  padding: 18px 24px 16px;
  background: var(--el-fill-color-lighter);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.panel-dot {
  flex-shrink: 0;
  width: 4px;
  height: 18px;
  background: var(--el-color-primary);
  border-radius: 2px;

  &--green {
    background: var(--el-color-success);
  }
}

.panel-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  letter-spacing: 0.4px;
}

.count-badge {
  font-size: 12px;
}

.list-toolbar {
  display: flex;
  flex-shrink: 0;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 14px 24px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.list-body {
  flex: 1;
  min-height: 0;
  padding: 16px 20px;
  overflow-y: auto;

  :deep(.el-table) {
    font-size: 14px;
  }

  :deep(.el-table th.el-table__cell) {
    padding: 10px 0;
    font-size: 13px;
  }

  :deep(.el-table td.el-table__cell) {
    padding: 12px 0;
  }
}
</style>
