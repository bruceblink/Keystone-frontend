<script setup lang="ts">
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import Upload from "@iconify-icons/ep/upload";
import type { UpdateRecord } from "../utils/types";
import { useBatchUpdate } from "../utils/useBatchUpdate";

defineOptions({ name: "SoftwareBatchUpdate" });

const emit = defineEmits<{
  (e: "submitted", records: UpdateRecord[]): void;
}>();

const {
  allDevices,
  selectedDevices,
  handleSelectionChange,
  deviceColumns,
  uniqueSoftwareList,
  filteredVersionList,
  formRef,
  form,
  rules,
  submitting,
  handleSubmit
} = useBatchUpdate(records => emit("submitted", records));
</script>

<template>
  <div class="batch-wrap">
    <!-- 左：设备选择表格 -->
    <div class="devices-panel">
      <div class="panel-header">
        <span>选择设备</span>
        <el-tag size="small" type="info">
          已选 {{ selectedDevices.length }} / {{ allDevices.length }} 台
        </el-tag>
      </div>
      <pure-table
        border
        align-whole="center"
        show-overflow-tooltip
        table-layout="auto"
        :data="allDevices"
        :columns="deviceColumns"
        :header-cell-style="{
          background: 'var(--el-table-row-hover-bg-color)',
          color: 'var(--el-text-color-primary)'
        }"
        @selection-change="handleSelectionChange"
      />
    </div>

    <!-- 右：版本选择 + 摘要 -->
    <div class="version-panel">
      <div class="panel-header">
        <span>选择目标版本</span>
        <el-tag size="small" type="info">
          可选 {{ filteredVersionList.length }} 项
        </el-tag>
      </div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
        class="version-form"
      >
        <el-form-item label="更新软件" prop="name">
          <el-select
            v-model="form.name"
            placeholder="请选择软件"
            clearable
            style="width: 100%"
          >
            <el-option
              v-for="s in uniqueSoftwareList"
              :key="s"
              :label="s"
              :value="s"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="目标版本" prop="version">
          <el-select
            v-model="form.version"
            :placeholder="form.name ? '请选择版本' : '请先选择软件'"
            :disabled="!form.name"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="v in filteredVersionList"
              :key="v.uuid"
              :label="v.version"
              :value="v.version"
            >
              <div class="version-opt">
                <span class="v-num">{{ v.version }}</span>
                <span class="v-size">{{ v.size }} MB</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>

      <!-- 摘要 -->
      <div class="summary">
        <div class="summary-row">
          <span class="s-label">已选设备</span>
          <span class="s-value">{{ selectedDevices.length }} 台</span>
        </div>
        <div class="summary-row">
          <span class="s-label">目标软件</span>
          <span class="s-value">{{ form.name || "未选择" }}</span>
        </div>
        <div class="summary-row">
          <span class="s-label">目标版本</span>
          <span class="s-value">{{ form.version || "未选择" }}</span>
        </div>
      </div>

      <el-button
        type="primary"
        style="width: 100%; margin-top: 16px; border-radius: 8px"
        :loading="submitting"
        :icon="useRenderIcon(Upload)"
        @click="handleSubmit"
      >
        添加版本更新
      </el-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.batch-wrap {
  display: grid;
  grid-template-columns: minmax(0, 1.8fr) minmax(300px, 1fr);
  gap: 16px;
  align-items: start;
  padding: 16px 0;
}

.devices-panel,
.version-panel {
  overflow: hidden;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
  background: var(--el-table-row-hover-bg-color);
  border-bottom: 1px solid var(--el-border-color);
}

.version-form {
  padding: 16px 16px 0;
}

.version-opt {
  display: flex;
  justify-content: space-between;

  .v-num {
    font-weight: 600;
  }

  .v-size {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

.summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  margin: 0 16px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;

  .s-label {
    color: var(--el-text-color-secondary);
  }

  .s-value {
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
}

.version-panel > .el-button {
  width: calc(100% - 32px) !important;
  margin: 16px;
}

@media (width <= 1100px) {
  .batch-wrap {
    grid-template-columns: 1fr;
  }
}
</style>
