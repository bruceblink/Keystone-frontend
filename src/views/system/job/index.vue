<script setup lang="ts">
import { ref } from "vue";
import { useJobHook } from "./utils/hook";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { useSystemDict } from "@/views/system/utils/dict";

import Delete from "@iconify-icons/ep/delete";
import EditPen from "@iconify-icons/ep/edit-pen";
import Search from "@iconify-icons/ep/search";
import Refresh from "@iconify-icons/ep/refresh";
import VideoPlay from "@iconify-icons/ep/video-play";
import AddFill from "@iconify-icons/ri/add-circle-line";

defineOptions({
  name: "SystemJob"
});

const jobStatusOptions = useSystemDict("sysJob.status").options;
const tableRef = ref();
const searchFormRef = ref();

const {
  searchFormParams,
  pageLoading,
  columns,
  dataList,
  pagination,
  defaultSort,
  multipleSelection,
  getJobList,
  onSearch,
  resetForm,
  openDialog,
  handleDelete,
  handleBulkDelete,
  handleRun,
  handleStatusChange
} = useJobHook();
</script>

<template>
  <div class="main">
    <el-form
      ref="searchFormRef"
      :inline="true"
      :model="searchFormParams"
      class="search-form bg-bg_color w-[99/100] pl-8 pt-[12px]"
    >
      <el-form-item label="任务名称：" prop="jobName">
        <el-input
          v-model="searchFormParams.jobName"
          placeholder="请输入任务名称"
          clearable
          class="!w-[200px]"
        />
      </el-form-item>
      <el-form-item label="任务组名：" prop="jobGroup">
        <el-input
          v-model="searchFormParams.jobGroup"
          placeholder="请输入任务组名"
          clearable
          class="!w-[180px]"
        />
      </el-form-item>
      <el-form-item label="状态：" prop="status">
        <el-select
          v-model="searchFormParams.status"
          placeholder="请选择"
          clearable
          class="!w-[160px]"
        >
          <el-option
            v-for="dict in jobStatusOptions"
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
          :loading="pageLoading"
          @click="onSearch"
        >
          搜索
        </el-button>
        <el-button
          :icon="useRenderIcon(Refresh)"
          @click="resetForm(searchFormRef, tableRef)"
        >
          重置
        </el-button>
      </el-form-item>
    </el-form>

    <PureTableBar title="定时任务" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button
          type="primary"
          :icon="useRenderIcon(AddFill)"
          @click="openDialog()"
        >
          添加任务
        </el-button>
        <el-button
          type="danger"
          :icon="useRenderIcon(Delete)"
          @click="handleBulkDelete(tableRef)"
        >
          批量删除
        </el-button>
      </template>
      <template v-slot="{ size, dynamicColumns }">
        <pure-table
          border
          ref="tableRef"
          align-whole="center"
          showOverflowTooltip
          table-layout="auto"
          :loading="pageLoading"
          :size="size"
          adaptive
          :data="dataList"
          :columns="dynamicColumns"
          :default-sort="defaultSort"
          :pagination="pagination"
          :paginationSmall="size === 'small'"
          :header-cell-style="{
            background: 'var(--el-table-row-hover-bg-color)',
            color: 'var(--el-text-color-primary)'
          }"
          @page-size-change="getJobList"
          @page-current-change="getJobList"
          @sort-change="getJobList"
          @selection-change="
            rows => (multipleSelection = rows.map(item => item.jobId))
          "
        >
          <template #operation="{ row }">
            <el-button
              class="reset-margin"
              link
              type="primary"
              :size="size"
              :icon="useRenderIcon(VideoPlay)"
              @click="handleRun(row)"
            >
              执行
            </el-button>
            <el-button
              class="reset-margin"
              link
              :type="row.status === 1 ? 'warning' : 'success'"
              :size="size"
              @click="handleStatusChange(row, row.status === 1 ? 0 : 1)"
            >
              {{ row.status === 1 ? "暂停" : "恢复" }}
            </el-button>
            <el-button
              class="reset-margin"
              link
              type="primary"
              :size="size"
              :icon="useRenderIcon(EditPen)"
              @click="openDialog('编辑', row)"
            >
              修改
            </el-button>
            <el-button
              class="reset-margin"
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
  </div>
</template>

<style scoped lang="scss">
.search-form {
  :deep(.el-form-item) {
    margin-bottom: 12px;
  }
}
</style>
