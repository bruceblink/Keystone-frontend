<script setup lang="ts">
/**
 * 激光设备管理页面：船只选择、列表检索、增删改查、Excel 导入导出
 */
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import AddFill from "@iconify-icons/ri/add-circle-line";
import Delete from "@iconify-icons/ep/delete";
import Download from "@iconify-icons/ep/download";
import Upload from "@iconify-icons/ep/upload";
import Search from "@iconify-icons/ep/search";
import EditPen from "@iconify-icons/ep/edit-pen";
import { toRef, onMounted } from "vue";
import { useLaserList } from "./utils";
import type { LaserItem } from "./utils/types";
import LaserDialog from "./components/LaserDialog.vue";
import { useBoatStoreHook } from "@/store/modules/boat";

defineOptions({ name: "ParamDeviceLaser" });

const boatStore = useBoatStoreHook();

const {
  loading,
  searchQuery,
  dataList,
  pagination,
  onSearch,
  multipleSelection,
  columns,
  drawerVisible,
  isEdit,
  editForm,
  formRules,
  areaIdOptions,
  areaCodeOptions,
  brandOptions,
  handleAdd,
  handleEdit,
  submitForm,
  handleBatchDelete,
  handleRefresh,
  handleExport,
  handleImport,
  importTemplate,
  getAreaCodeText,
  getAreaIdText,
  getBrandText,
  getStatusText,
  getStatusTagType
} = useLaserList(toRef(boatStore, "selectedBoatId"));

onMounted(() => {
  boatStore.fetchBoatList();
});
</script>

<template>
  <div class="main">
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
        v-else
        title="请先选择船只，再管理激光设备"
        type="warning"
        :closable="false"
        class="!py-1 !w-auto"
      />
    </div>

    <el-form inline class="search-form bg-bg_color w-[99/100] pl-8 pt-[12px]">
      <el-form-item>
        <el-input
          v-model="searchQuery"
          placeholder="搜索设备编号 / 设备名称"
          clearable
          class="!w-[320px]"
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

    <PureTableBar
      title="激光设备管理"
      :columns="columns"
      @refresh="handleRefresh"
    >
      <template #buttons>
        <el-button
          type="primary"
          :icon="useRenderIcon(AddFill)"
          :disabled="!boatStore.selectedBoatId"
          @click="handleAdd"
        >
          添加
        </el-button>
        <el-button
          type="danger"
          plain
          :icon="useRenderIcon(Delete)"
          :disabled="!multipleSelection.length"
          @click="handleBatchDelete"
        >
          删除
        </el-button>
        <el-button
          type="warning"
          plain
          :icon="useRenderIcon(Upload)"
          :disabled="!boatStore.selectedBoatId"
          @click="handleImport"
        >
          导入
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
          @selection-change="(rows: LaserItem[]) => (multipleSelection = rows)"
        >
          <template #areacode="{ row }">
            {{ getAreaCodeText(row.areacode) }}
          </template>
          <template #areaid="{ row }">
            {{ getAreaIdText(row.areaid) }}
          </template>
          <template #brand="{ row }">
            {{ getBrandText(row.brand) }}
          </template>
          <template #status="{ row }">
            <el-tag :type="getStatusTagType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
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
          </template>
        </pure-table>
      </template>
    </PureTableBar>

    <LaserDialog
      v-model:visible="drawerVisible"
      v-model:form="editForm"
      :mode="isEdit ? 'edit' : 'add'"
      :form-rules="formRules"
      :area-id-options="areaIdOptions"
      :area-code-options="areaCodeOptions"
      :brand-options="brandOptions"
      :on-import-template="importTemplate"
      @submit="submitForm"
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
