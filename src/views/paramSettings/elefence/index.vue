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
  addFormRef,
  editFormRef,
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

    <!-- 新增对话框 -->
    <el-dialog
      v-model="addVisible"
      title="新增电子围栏"
      width="520px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form
        ref="addFormRef"
        :model="addForm"
        :rules="addRules"
        label-width="80px"
      >
        <el-form-item label="数据类型" prop="datatype">
          <el-select
            v-model="addForm.datatype"
            placeholder="请选择数据类型"
            class="w-full"
          >
            <el-option label="区域" value="0" />
            <el-option label="点" value="1" />
            <el-option label="线" value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="水域类型" prop="areatype">
          <el-select
            v-model="addForm.areatype"
            placeholder="请选择水域类型"
            class="w-full"
          >
            <el-option
              v-for="opt in areaOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="区域名称" prop="name">
          <el-input v-model="addForm.name" placeholder="请输入区域名称" />
        </el-form-item>
        <el-form-item label="位置数据" prop="data">
          <div class="points-wrapper">
            <div
              v-for="(point, idx) in addForm.data"
              :key="idx"
              class="point-row"
            >
              <span class="point-label">经度</span>
              <el-input v-model.number="point.lng" class="coord-input" />
              <span class="point-label">纬度</span>
              <el-input v-model.number="point.lat" class="coord-input" />
              <el-button
                v-if="addForm.data.length > 1"
                type="danger"
                size="small"
                link
                @click="removePoint(idx)"
              >
                删除
              </el-button>
            </div>
            <el-button type="primary" size="small" @click="addPoint"
              >添加坐标点</el-button
            >
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAdd">确定</el-button>
      </template>
    </el-dialog>

    <!-- 编辑对话框 -->
    <el-dialog
      v-model="editVisible"
      title="编辑电子围栏"
      width="520px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form
        ref="editFormRef"
        :model="editForm"
        :rules="editRules"
        label-width="80px"
      >
        <el-form-item label="数据类型" prop="datatype">
          <el-select
            v-model="editForm.datatype"
            placeholder="请选择数据类型"
            class="w-full"
          >
            <el-option label="区域" value="0" />
            <el-option label="点" value="1" />
            <el-option label="线" value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="水域类型" prop="areatype">
          <el-select
            v-model="editForm.areatype"
            placeholder="请选择水域类型"
            class="w-full"
          >
            <el-option
              v-for="opt in areaOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="区域名称" prop="name">
          <el-input v-model="editForm.name" placeholder="请输入区域名称" />
        </el-form-item>
        <el-form-item label="位置数据" prop="data">
          <div class="points-wrapper">
            <div
              v-for="(point, idx) in editForm.data"
              :key="idx"
              class="point-row"
            >
              <span class="point-label">经度</span>
              <el-input v-model.number="point.lng" class="coord-input" />
              <span class="point-label">纬度</span>
              <el-input v-model.number="point.lat" class="coord-input" />
              <el-button
                v-if="editForm.data.length > 1"
                type="danger"
                size="small"
                link
                @click="removeEditPoint(idx)"
              >
                删除
              </el-button>
            </div>
            <el-button type="primary" size="small" @click="addEditPoint"
              >添加坐标点</el-button
            >
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="submitEdit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.search-form {
  :deep(.el-form-item) {
    margin-bottom: 12px;
  }
}

.points-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.point-row {
  display: flex;
  gap: 6px;
  align-items: center;
}

.point-label {
  font-size: 13px;
  color: var(--el-text-color-regular);
  white-space: nowrap;
}

.coord-input {
  width: 110px;
}
</style>
