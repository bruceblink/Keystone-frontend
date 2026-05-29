<script setup lang="ts">
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import AddFill from "@iconify-icons/ri/add-circle-line";
import EditPen from "@iconify-icons/ep/edit-pen";
import Delete from "@iconify-icons/ep/delete";
import Download from "@iconify-icons/ep/download";
import Upload from "@iconify-icons/ep/upload";
import Search from "@iconify-icons/ep/search";
import { toRef, onMounted } from "vue";
import { useAlarmTypeList } from "./utils";
import type { AlarmTypeItem } from "./utils/types";
import { TYPE_MAP } from "./utils/dict";
import AlarmTypeDialog from "./components/AlarmTypeDialog.vue";
import { useBoatStoreHook } from "@/store/modules/boat";

defineOptions({ name: "ParamAlaramType" });

const boatStore = useBoatStoreHook();

const {
  loading,
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
  handleSwitchChange,
  handleAdd,
  submitAdd,
  handleEdit,
  submitEdit,
  handleDelete,
  handleBatchDelete,
  handleRefresh,
  handleExport,
  handleImport
} = useAlarmTypeList(toRef(boatStore, "selectedBoatId"));

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
        v-else
        title="请先选择船只，再查看或编辑该船的报警类型"
        type="warning"
        :closable="false"
        class="!py-1 !w-auto"
      />
    </div>

    <!-- 搜索栏 -->
    <el-form inline class="search-form bg-bg_color w-[99/100] pl-8 pt-[12px]">
      <el-form-item>
        <el-input
          v-model="searchQuery"
          placeholder="搜索报警编号 / 报警类型名称"
          clearable
          class="!w-[280px]"
          :disabled="!boatStore.selectedBoatId"
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

    <PureTableBar title="报警类型" :columns="columns" @refresh="handleRefresh">
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
          row-key="_id"
          adaptive
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
          @selection-change="(rows: AlarmTypeItem[]) => (multipleSelection = rows)"
        >
          <template #type="{ row }">
            {{ TYPE_MAP[row.type] || row.type }}
          </template>
          <template #s2cloud="{ row }">
            <el-switch
              v-model="row.s2cloud"
              active-value="1"
              inactive-value="0"
              @change="handleSwitchChange(row)"
            />
          </template>
          <template #s2ship="{ row }">
            <el-switch
              v-model="row.s2ship"
              active-value="1"
              inactive-value="0"
              @change="handleSwitchChange(row)"
            />
          </template>
          <template #visibility="{ row }">
            <el-switch
              v-model="row.visibility"
              active-value="1"
              inactive-value="0"
              @change="handleSwitchChange(row)"
            />
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
    <AlarmTypeDialog
      v-model:visible="addVisible"
      v-model:form="addForm"
      mode="add"
      :rules="addRules"
      @submit="submitAdd"
    />

    <!-- 编辑弹窗 -->
    <AlarmTypeDialog
      v-model:visible="editVisible"
      v-model:form="editForm"
      mode="edit"
      :rules="editRules"
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

.boat-selector-bar {
  border-bottom: 1px solid var(--el-border-color-lighter);
}
</style>
