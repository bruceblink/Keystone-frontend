<script setup lang="ts">
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import AddFill from "@iconify-icons/ri/add-circle-line";
import Delete from "@iconify-icons/ep/delete";
import Download from "@iconify-icons/ep/download";
import Upload from "@iconify-icons/ep/upload";
import Search from "@iconify-icons/ep/search";
import EditPen from "@iconify-icons/ep/edit-pen";
import { toRef, onMounted } from "vue";
import { useDictList } from "./utils";
import type { DictItem, DictTypeItem } from "./utils/types";
import DictDialog from "./components/DictDialog.vue";
import DictTypeDialog from "./components/DictTypeDialog.vue";
import { useBoatStoreHook } from "@/store/modules/boat";

defineOptions({ name: "ParamDict" });

const boatStore = useBoatStoreHook();

const {
  loading,
  activeTab,
  searchQuery,
  groupFilter,
  selectedDictType,
  dictTypeOptions,
  moduleOptions,
  categoryOptions,
  scopeOptions,
  needsBoat,
  showModuleFilter,
  dataList,
  pagination,
  onSearch,
  onGroupFilterChange,
  onDictTypeChange,
  multipleSelection,
  columns,
  addVisible,
  editVisible,
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
  handleImport,
  typeLoading,
  typeSearchQuery,
  typeDataList,
  typePagination,
  typeColumns,
  typeAddVisible,
  typeEditVisible,
  typeAddForm,
  typeEditForm,
  typeFormRules,
  handleTypeAdd,
  submitTypeAdd,
  handleTypeEdit,
  submitTypeEdit,
  handleTypeDelete,
  handleTypeRefresh
} = useDictList(toRef(boatStore, "selectedBoatId"));

onMounted(() => {
  boatStore.fetchBoatList();
});
</script>

<template>
  <div class="main">
    <!-- 船只选择器 -->
    <div
      class="boat-selector-bar bg-bg_color w-[99/100] pl-8 pt-[12px] pb-[12px] flex items-center gap-4"
    >
      <span class="text-sm font-medium text-text_color_regular"
        >当前船只：</span
      >
      <el-select
        :model-value="boatStore.selectedBoatId"
        placeholder="请选择船只"
        clearable
        filterable
        :loading="boatStore.boatsLoading"
        :disabled="boatStore.isShipSide"
        class="!w-[320px]"
        @update:model-value="boatStore.setSelectedBoatId"
      >
        <el-option
          v-for="b in boatStore.allBoats"
          :key="b.devid"
          :label="`${b.devid} - ${b.shipname_cn}`"
          :value="b.devid"
        />
      </el-select>
      <el-tag v-if="boatStore.selectedBoat" type="success">
        {{ boatStore.selectedBoat.shipname_cn }}（{{
          boatStore.selectedBoat.devid
        }}）
      </el-tag>
      <el-alert
        v-else-if="needsBoat"
        title="请先选择船只，再查看或编辑该船的数据字典"
        type="warning"
        :closable="false"
        class="!py-1 !w-auto"
      />
    </div>

    <el-tabs v-model="activeTab" class="dict-tabs bg-bg_color w-[99/100] px-6">
      <el-tab-pane label="字典值" name="items" />
      <el-tab-pane label="字典类型" name="types" />
    </el-tabs>

    <!-- 搜索栏 -->
    <el-form
      v-if="activeTab === 'items'"
      inline
      class="search-form bg-bg_color w-[99/100] pl-8 pt-[12px]"
    >
      <el-form-item>
        <el-select
          v-model="selectedDictType"
          placeholder="字典类型"
          filterable
          class="!w-[260px]"
          @change="onDictTypeChange"
        >
          <el-option
            v-for="item in dictTypeOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item v-if="showModuleFilter">
        <el-select
          v-model="groupFilter"
          placeholder="模块"
          clearable
          filterable
          class="!w-[180px]"
          :disabled="!boatStore.selectedBoatId"
          @change="onGroupFilterChange"
        >
          <el-option
            v-for="item in moduleOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-input
          v-model="searchQuery"
          placeholder="搜索值标识 / 显示名称 / 描述"
          clearable
          class="!w-[280px]"
          :disabled="needsBoat && !boatStore.selectedBoatId"
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
    <el-form
      v-else
      inline
      class="search-form bg-bg_color w-[99/100] pl-8 pt-[12px]"
    >
      <el-form-item>
        <el-input
          v-model="typeSearchQuery"
          placeholder="搜索类型标识 / 名称 / 别名 / 备注"
          clearable
          class="!w-[320px]"
        >
          <template #prefix>
            <el-icon>
              <component :is="useRenderIcon(Search)" />
            </el-icon>
          </template>
        </el-input>
      </el-form-item>
    </el-form>

    <PureTableBar
      v-if="activeTab === 'items'"
      title="字典值"
      :columns="columns"
      @refresh="handleRefresh"
    >
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
          :disabled="!multipleSelection.length"
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
          row-key="_id"
          :loading="loading"
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

    <PureTableBar
      v-else
      title="字典类型"
      :columns="typeColumns"
      @refresh="handleTypeRefresh"
    >
      <template #buttons>
        <el-button
          type="primary"
          :icon="useRenderIcon(AddFill)"
          @click="handleTypeAdd"
        >
          新增
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
          row-key="dictType"
          :loading="typeLoading"
          :data="typeDataList"
          :columns="dynamicColumns"
          :pagination="typePagination"
          :paginationSmall="size === 'small'"
          :header-cell-style="{
            background: 'var(--el-table-row-hover-bg-color)',
            color: 'var(--el-text-color-primary)'
          }"
          @page-size-change="
            v => {
              typePagination.pageSize = v;
              typePagination.currentPage = 1;
            }
          "
          @page-current-change="v => (typePagination.currentPage = v)"
        >
          <template #status="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">
              {{ row.status === 1 ? "启用" : "停用" }}
            </el-tag>
          </template>
          <template #aliases="{ row }">
            <div class="alias-list">
              <el-tag
                v-for="alias in row.aliases"
                :key="alias"
                size="small"
                effect="plain"
              >
                {{ alias }}
              </el-tag>
            </div>
          </template>
          <template #operation="{ row }">
            <el-button
              link
              type="primary"
              :size="size"
              :icon="useRenderIcon(EditPen)"
              @click="handleTypeEdit(row as DictTypeItem)"
            >
              编辑
            </el-button>
            <el-button
              link
              type="danger"
              :size="size"
              :icon="useRenderIcon(Delete)"
              @click="handleTypeDelete(row as DictTypeItem)"
            >
              删除
            </el-button>
          </template>
        </pure-table>
      </template>
    </PureTableBar>

    <!-- 新增弹窗 -->
    <DictDialog
      v-model:visible="addVisible"
      v-model:form="addForm"
      mode="add"
      :formRules="formRules"
      :moduleOptions="moduleOptions"
      :showModuleField="showModuleFilter"
      :onKeyValueInput="onKeyValueInput"
      @submit="submitAdd"
    />

    <!-- 编辑弹窗 -->
    <DictDialog
      v-model:visible="editVisible"
      v-model:form="editForm"
      mode="edit"
      :formRules="formRules"
      :moduleOptions="moduleOptions"
      :showModuleField="showModuleFilter"
      :onKeyValueInput="onKeyValueInput"
      @submit="submitEdit"
    />

    <DictTypeDialog
      v-model:visible="typeAddVisible"
      v-model:form="typeAddForm"
      mode="add"
      :formRules="typeFormRules"
      :categoryOptions="categoryOptions"
      :scopeOptions="scopeOptions"
      @submit="submitTypeAdd"
    />

    <DictTypeDialog
      v-model:visible="typeEditVisible"
      v-model:form="typeEditForm"
      mode="edit"
      :formRules="typeFormRules"
      :categoryOptions="categoryOptions"
      :scopeOptions="scopeOptions"
      @submit="submitTypeEdit"
    />
  </div>
</template>

<style scoped lang="scss">
.search-form {
  :deep(.el-form-item) {
    margin-bottom: 12px;
  }
}

.boat-selector-bar {
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.dict-tabs {
  border-bottom: 1px solid var(--el-border-color-lighter);

  :deep(.el-tabs__header) {
    margin-bottom: 0;
  }
}

.alias-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
}
</style>
