<script setup lang="ts">
import { ref } from "vue";
import { useDictHook } from "./utils/hook";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { useUserStoreHook } from "@/store/modules/user";

import Delete from "@iconify-icons/ep/delete";
import EditPen from "@iconify-icons/ep/edit-pen";
import Search from "@iconify-icons/ep/search";
import Refresh from "@iconify-icons/ep/refresh";
import AddFill from "@iconify-icons/ri/add-circle-line";

defineOptions({
  name: "SystemDict"
});

const statusList = useUserStoreHook().dictionaryList["common.status"];
const typeTableRef = ref();
const dataTableRef = ref();
const typeSearchFormRef = ref();
const dataSearchFormRef = ref();

const {
  typeSearchFormParams,
  dataSearchFormParams,
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
  selectDictType,
  openTypeDialog,
  openDataDialog,
  handleDeleteType,
  handleDeleteData
} = useDictHook();
</script>

<template>
  <div class="main">
    <el-tabs>
      <el-tab-pane label="字典类型">
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
                  @click.stop="selectDictType(row)"
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

      <el-tab-pane label="字典数据">
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
              @click="openDataDialog()"
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
  </div>
</template>

<style scoped lang="scss">
.search-form {
  :deep(.el-form-item) {
    margin-bottom: 12px;
  }
}
</style>
