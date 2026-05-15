<script setup lang="ts">
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import AddFill from "@iconify-icons/ri/add-circle-line";
import EditPen from "@iconify-icons/ep/edit-pen";
import Delete from "@iconify-icons/ep/delete";
import Download from "@iconify-icons/ep/download";
import Upload from "@iconify-icons/ep/upload";
import Search from "@iconify-icons/ep/search";
import { useFenceList } from "./utils";
import type { FenceItem } from "./utils/types";
import FenceDialog from "./components/FenceDialog.vue";

defineOptions({ name: "ParamElefence" });

const {
  searchQuery,
  dataList,
  pagination,
  onSearch,
  multipleSelection,
  columns,
  addVisible,
  editVisible,
  addForm,
  editForm,
  addRules,
  editRules,
  areaOptions,
  areaTypeMap,
  dataTypeMap,
  formatPoints,
  handleAdd,
  addPoint,
  removePoint,
  submitAdd,
  handleEdit,
  addEditPoint,
  removeEditPoint,
  submitEdit,
  handleDelete,
  handleBatchDelete,
  handleRefresh,
  handleExport,
  handleImport
} = useFenceList();
</script>

<template>
  <div class="main">
    <!-- 搜索栏 -->
    <el-form inline class="search-form bg-bg_color w-[99/100] pl-8 pt-[12px]">
      <el-form-item>
        <el-input
          v-model="searchQuery"
          placeholder="搜索区域名称 / 水域类型"
          clearable
          class="!w-[280px]"
          @input="onSearch"
        >
          <template #prefix>
            <el-icon>
              <component :is="useRenderIcon(Search)" />
            </el-icon>
          </template>
        </el-input>
      </el-form-item>
    </el-form>

    <PureTableBar title="电子围栏" :columns="columns" @refresh="handleRefresh">
      <template #buttons>
        <el-button
          type="primary"
          :icon="useRenderIcon(AddFill)"
          @click="handleAdd"
        >
          新增
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
        <el-button
          type="success"
          plain
          :icon="useRenderIcon(Download)"
          @click="handleExport"
        >
          导出
        </el-button>
        <el-button
          type="warning"
          plain
          :icon="useRenderIcon(Upload)"
          @click="handleImport"
        >
          导入
        </el-button>
      </template>

      <template v-slot="{ size, dynamicColumns }">
        <pure-table
          border
          align-whole="center"
          show-overflow-tooltip
          table-layout="auto"
          :size="size"
          adaptive
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
              pagination.currentPage = 1;
            }
          "
          @page-current-change="v => (pagination.currentPage = v)"
          @selection-change="(rows: FenceItem[]) => (multipleSelection = rows)"
        >
          <template #areatype="{ row }">
            {{ areaTypeMap[row.areatype] || row.areatype }}
          </template>
          <template #datatype="{ row }">
            {{ dataTypeMap[row.datatype] || row.datatype }}
          </template>
          <template #data="{ row }">
            {{ formatPoints(row.data) }}
          </template>
          <template #operation="{ row }">
            <el-button
              link
              type="primary"
              :size="size"
              :icon="useRenderIcon(EditPen)"
              @click="handleEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              link
              type="danger"
              :size="size"
              :icon="useRenderIcon(Delete)"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </pure-table>
      </template>
    </PureTableBar>

    <!-- 新增弹窗 -->
    <FenceDialog
      v-model:visible="addVisible"
      v-model:form="addForm"
      mode="add"
      :rules="addRules"
      :areaOptions="areaOptions"
      :onAddPoint="addPoint"
      :onRemovePoint="removePoint"
      @submit="submitAdd"
    />

    <!-- 编辑弹窗 -->
    <FenceDialog
      v-model:visible="editVisible"
      v-model:form="editForm"
      mode="edit"
      :rules="editRules"
      :areaOptions="areaOptions"
      :onAddPoint="addEditPoint"
      :onRemovePoint="removeEditPoint"
      @submit="submitEdit"
    />
  </div>
</template>

<style scoped lang="scss">
.search-form {
  :deep(.el-form-item) {
    margin-bottom: 12px;
  }
}
</style>
