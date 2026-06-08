<script setup lang="ts">
import { computed, ref } from "vue";
import { useDictHook } from "./utils/hook";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { useUserStoreHook } from "@/store/modules/user";
import type { DictionaryData } from "@/api/common/login";

import Delete from "@iconify-icons/ep/delete";
import EditPen from "@iconify-icons/ep/edit-pen";
import Search from "@iconify-icons/ep/search";
import Refresh from "@iconify-icons/ep/refresh";
import Tickets from "@iconify-icons/ep/tickets";
import AddFill from "@iconify-icons/ri/add-circle-line";

defineOptions({
  name: "SystemDict"
});

type DictionaryList =
  | Map<string, DictionaryData[]>
  | Record<string, DictionaryData[]>;

const userStore = useUserStoreHook();
const typeTableRef = ref();
const dataTableRef = ref();
const typeSearchFormRef = ref();
const dataSearchFormRef = ref();
const activeTab = ref("type");
const statusList = computed(() => getDictionaryList("common.status"));

function getDictionaryList(dictType: string) {
  const dictionaryList = userStore.dictionaryList as DictionaryList;
  return dictionaryList instanceof Map
    ? dictionaryList.get(dictType) ?? []
    : dictionaryList[dictType] ?? [];
}

const {
  typeSearchFormParams,
  dataSearchFormParams,
  selectedDictType,
  dataDialogVisible,
  typePagination,
  dataPagination,
  typeColumns,
  dataColumns,
  typeDataList,
  dictDataList,
  typeLoading,
  dataLoading,
  getTypeList,
  getDataList,
  searchTypes,
  searchData,
  resetTypeForm,
  resetDataForm,
  clearDataSearch,
  selectDictType,
  openDictDataDrawer,
  openTypeDialog,
  openDataDialog,
  handleDeleteType,
  handleDeleteData
} = useDictHook();
</script>

<template>
  <div class="main">
    <el-tabs
      v-model="activeTab"
      @tab-change="activeName => activeName === 'data' && clearDataSearch()"
    >
      <el-tab-pane label="字典类型" name="type" lazy>
        <el-form
          ref="typeSearchFormRef"
          :inline="true"
          :model="typeSearchFormParams"
          class="search-form bg-bg_color w-[99/100] pl-8 pt-[12px]"
        >
          <el-form-item label="字典名称：" prop="dictName">
            <el-input
              v-model="typeSearchFormParams.dictName"
              placeholder="请输入字典名称"
              clearable
              class="!w-[200px]"
            />
          </el-form-item>
          <el-form-item label="字典类型：" prop="dictType">
            <el-input
              v-model="typeSearchFormParams.dictType"
              placeholder="请输入字典类型"
              clearable
              class="!w-[200px]"
            />
          </el-form-item>
          <el-form-item label="状态：" prop="status">
            <el-select
              v-model="typeSearchFormParams.status"
              placeholder="请选择"
              clearable
              class="!w-[160px]"
            >
              <el-option
                v-for="dict in statusList"
                :key="dict.value"
                :label="dict.label"
                :value="dict.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button
              type="primary"
              :icon="useRenderIcon(Search)"
              :loading="typeLoading"
              @click="searchTypes"
            >
              搜索
            </el-button>
            <el-button
              :icon="useRenderIcon(Refresh)"
              @click="resetTypeForm(typeSearchFormRef, typeTableRef)"
            >
              重置
            </el-button>
          </el-form-item>
        </el-form>

        <PureTableBar
          title="字典类型"
          :columns="typeColumns"
          @refresh="searchTypes"
        >
          <template #buttons>
            <el-button
              type="primary"
              :icon="useRenderIcon(AddFill)"
              @click="openTypeDialog()"
            >
              添加类型
            </el-button>
          </template>
          <template v-slot="{ size, dynamicColumns }">
            <pure-table
              border
              ref="typeTableRef"
              align-whole="center"
              showOverflowTooltip
              table-layout="auto"
              :loading="typeLoading"
              :size="size"
              adaptive
              :data="typeDataList"
              :columns="dynamicColumns"
              :pagination="typePagination"
              :paginationSmall="size === 'small'"
              :header-cell-style="{
                background: 'var(--el-table-row-hover-bg-color)',
                color: 'var(--el-text-color-primary)'
              }"
              @page-size-change="getTypeList"
              @page-current-change="getTypeList"
              @row-click="selectDictType"
            >
              <template #typeOperation="{ row }">
                <el-button
                  class="reset-margin"
                  link
                  type="primary"
                  :size="size"
                  :icon="useRenderIcon(EditPen)"
                  @click.stop="openTypeDialog('编辑', row)"
                >
                  修改
                </el-button>
                <el-button
                  class="reset-margin"
                  link
                  type="primary"
                  :size="size"
                  :icon="useRenderIcon(Tickets)"
                  @click.stop="openDictDataDrawer(row)"
                >
                  数据
                </el-button>
                <el-button
                  class="reset-margin"
                  link
                  type="danger"
                  :size="size"
                  :icon="useRenderIcon(Delete)"
                  @click.stop="handleDeleteType(row)"
                >
                  删除
                </el-button>
              </template>
            </pure-table>
          </template>
        </PureTableBar>
      </el-tab-pane>

      <el-tab-pane label="字典数据" name="data" lazy>
        <el-form
          ref="dataSearchFormRef"
          :inline="true"
          :model="dataSearchFormParams"
          class="search-form bg-bg_color w-[99/100] pl-8 pt-[12px]"
        >
          <el-form-item label="字典类型：" prop="dictType">
            <el-input
              v-model="dataSearchFormParams.dictType"
              placeholder="请输入字典类型"
              clearable
              class="!w-[200px]"
            />
          </el-form-item>
          <el-form-item label="数据标签：" prop="dictLabel">
            <el-input
              v-model="dataSearchFormParams.dictLabel"
              placeholder="请输入数据标签"
              clearable
              class="!w-[200px]"
            />
          </el-form-item>
          <el-form-item label="状态：" prop="status">
            <el-select
              v-model="dataSearchFormParams.status"
              placeholder="请选择"
              clearable
              class="!w-[160px]"
            >
              <el-option
                v-for="dict in statusList"
                :key="dict.value"
                :label="dict.label"
                :value="dict.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button
              type="primary"
              :icon="useRenderIcon(Search)"
              :loading="dataLoading"
              @click="searchData"
            >
              搜索
            </el-button>
            <el-button
              :icon="useRenderIcon(Refresh)"
              @click="resetDataForm(dataSearchFormRef, dataTableRef)"
            >
              重置
            </el-button>
          </el-form-item>
        </el-form>

        <PureTableBar
          title="字典数据"
          :columns="dataColumns"
          @refresh="searchData"
        >
          <template #buttons>
            <el-button
              type="primary"
              :icon="useRenderIcon(AddFill)"
              @click="openDataDialog('新增')"
            >
              添加数据
            </el-button>
          </template>
          <template v-slot="{ size, dynamicColumns }">
            <pure-table
              border
              ref="dataTableRef"
              align-whole="center"
              showOverflowTooltip
              table-layout="auto"
              :loading="dataLoading"
              :size="size"
              adaptive
              :data="dictDataList"
              :columns="dynamicColumns"
              :pagination="dataPagination"
              :paginationSmall="size === 'small'"
              :header-cell-style="{
                background: 'var(--el-table-row-hover-bg-color)',
                color: 'var(--el-text-color-primary)'
              }"
              @page-size-change="getDataList"
              @page-current-change="getDataList"
            >
              <template #dataOperation="{ row }">
                <el-button
                  class="reset-margin"
                  link
                  type="primary"
                  :size="size"
                  :icon="useRenderIcon(EditPen)"
                  @click="openDataDialog('编辑', row)"
                >
                  修改
                </el-button>
                <el-button
                  class="reset-margin"
                  link
                  type="danger"
                  :size="size"
                  :icon="useRenderIcon(Delete)"
                  @click="handleDeleteData(row)"
                >
                  删除
                </el-button>
              </template>
            </pure-table>
          </template>
        </PureTableBar>
      </el-tab-pane>
    </el-tabs>

    <el-dialog
      v-model="dataDialogVisible"
      class="dict-data-dialog-modal"
      :title="`字典数据 - ${selectedDictType?.dictName ?? ''}`"
      width="62.4%"
      top="6vh"
      draggable
      destroy-on-close
    >
      <div class="dict-data-dialog">
        <div class="dict-data-dialog__toolbar">
          <div class="dict-data-dialog__meta">
            <span class="dict-data-dialog__name">{{
              selectedDictType?.dictType
            }}</span>
            <span class="dict-data-dialog__remark">{{
              selectedDictType?.remark
            }}</span>
          </div>
          <div class="dict-data-dialog__actions">
            <el-button
              :icon="useRenderIcon(Refresh)"
              :loading="dataLoading"
              @click="searchData"
            >
              刷新
            </el-button>
            <el-button
              type="primary"
              :icon="useRenderIcon(AddFill)"
              @click="openDataDialog('新增', undefined, { lockDictType: true })"
            >
              添加数据
            </el-button>
          </div>
        </div>

        <pure-table
          border
          align-whole="center"
          showOverflowTooltip
          table-layout="auto"
          :loading="dataLoading"
          height="calc(80vh - 192px)"
          :data="dictDataList"
          :columns="dataColumns"
          :pagination="dataPagination"
          :header-cell-style="{
            background: 'var(--el-table-row-hover-bg-color)',
            color: 'var(--el-text-color-primary)'
          }"
          @page-size-change="getDataList"
          @page-current-change="getDataList"
        >
          <template #dataOperation="{ row }">
            <el-button
              class="reset-margin"
              link
              type="primary"
              :icon="useRenderIcon(EditPen)"
              @click="openDataDialog('编辑', row)"
            >
              修改
            </el-button>
            <el-button
              class="reset-margin"
              link
              type="danger"
              :icon="useRenderIcon(Delete)"
              @click="handleDeleteData(row)"
            >
              删除
            </el-button>
          </template>
        </pure-table>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.search-form {
  :deep(.el-form-item) {
    margin-bottom: 12px;
  }
}

.dict-data-dialog {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
}

:deep(.dict-data-dialog-modal) {
  display: flex;
  flex-direction: column;
  height: 80vh;
}

:deep(.dict-data-dialog-modal .el-dialog__body) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.dict-data-dialog__toolbar {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
}

.dict-data-dialog__meta {
  display: flex;
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.dict-data-dialog__name {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.dict-data-dialog__remark {
  overflow: hidden;
  color: var(--el-text-color-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dict-data-dialog__actions {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
}
</style>
