<script setup lang="ts">
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import AddFill from "@iconify-icons/ri/add-circle-line";
import EditPen from "@iconify-icons/ep/edit-pen";
import Delete from "@iconify-icons/ep/delete";
import Download from "@iconify-icons/ep/download";
import Upload from "@iconify-icons/ep/upload";
import Search from "@iconify-icons/ep/search";
import { useDictList } from "./utils";
import type { DictItem } from "./utils/types";

defineOptions({ name: "ParamDict" });

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
  formRules,
  onKeyValueInput,
  handleAdd,
  submitAdd,
  handleEdit,
  submitEdit,
  handleDelete,
  handleBatchDelete,
  handleRefresh,
  handleExport,
  handleImport
} = useDictList();
</script>

<template>
  <div class="main">
    <!-- 搜索栏 -->
    <el-form inline class="search-form bg-bg_color w-[99/100] pl-8 pt-[12px]">
      <el-form-item>
        <el-input
          v-model="searchQuery"
          placeholder="搜索键名 / 键值 / 描述"
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

    <PureTableBar title="数据字典" :columns="columns" @refresh="handleRefresh">
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
          @selection-change="(rows: DictItem[]) => (multipleSelection = rows)"
        >
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
      title="新增数据字典"
      width="480px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form
        ref="addFormRef"
        :model="addForm"
        :rules="formRules"
        label-width="70px"
      >
        <el-form-item label="键名" prop="keyname">
          <el-input v-model="addForm.keyname" placeholder="请输入键名" />
        </el-form-item>
        <el-form-item label="键值" prop="keyvalue">
          <el-input
            v-model="addForm.keyvalue"
            placeholder="请输入键值"
            @input="(v: string) => onKeyValueInput(v, addForm)"
          />
        </el-form-item>
        <el-form-item label="类型">
          <el-input v-model="addForm.type" disabled />
        </el-form-item>
        <el-form-item label="用户">
          <el-input v-model="addForm.user" disabled />
        </el-form-item>
        <el-form-item label="描述" prop="descripton">
          <el-input
            v-model="addForm.descripton"
            placeholder="请输入描述"
            type="textarea"
            :rows="2"
          />
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
      title="编辑数据字典"
      width="480px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form
        ref="editFormRef"
        :model="editForm"
        :rules="formRules"
        label-width="70px"
      >
        <el-form-item label="键名">
          <el-input v-model="editForm.keyname" disabled />
        </el-form-item>
        <el-form-item label="键值" prop="keyvalue">
          <el-input
            v-model="editForm.keyvalue"
            placeholder="请输入键值"
            @input="(v: string) => onKeyValueInput(v, editForm)"
          />
        </el-form-item>
        <el-form-item label="类型">
          <el-input v-model="editForm.type" disabled />
        </el-form-item>
        <el-form-item label="用户">
          <el-input v-model="editForm.user" disabled />
        </el-form-item>
        <el-form-item label="描述" prop="descripton">
          <el-input
            v-model="editForm.descripton"
            placeholder="请输入描述"
            type="textarea"
            :rows="2"
          />
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
</style>
