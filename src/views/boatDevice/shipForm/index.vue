<script setup lang="ts">
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { useBoatDeviceHook } from "./utils/hook";
import {
  GROUP_MAP,
  NAV_STATUS_MAP,
  getOnlineStatus,
  onlineTagType
} from "./utils/dict";
import SearchForm from "./components/SearchForm.vue";
import FormDialog from "./components/formDialog.vue";

import Delete from "@iconify-icons/ep/delete";
import EditPen from "@iconify-icons/ep/edit-pen";
import Setting from "@iconify-icons/ep/setting";
import AddFill from "@iconify-icons/ri/add-circle-line";
import Download from "@iconify-icons/ep/download";

defineOptions({ name: "BoatDevice" });

const {
  tableData,
  isFavorite,
  toggleFavorite,
  favoriteIcon,
  searchParams,
  pagination,
  onSearch,
  onFavoriteFilterChange,
  resetSearch,
  refreshList,
  dataList,
  multipleSelection,
  columns,
  dialogVisible,
  dialogType,
  currentRow,
  openAdd,
  openEdit,
  goToParamConfig,
  handleSubmit,
  handleDelete,
  handleExport
} = useBoatDeviceHook();
</script>

<template>
  <div class="main">
    <!-- 搜索栏 -->
    <search-form
      v-model="searchParams"
      @search="onSearch"
      @favorite-filter-change="onFavoriteFilterChange"
      @reset="resetSearch"
    />

    <!-- 表格区域 -->
    <PureTableBar
      title="船舶设备列表"
      :columns="columns"
      @refresh="refreshList"
    >
      <template #buttons>
        <el-button
          type="primary"
          :icon="useRenderIcon(AddFill)"
          @click="openAdd"
        >
          添加设备
        </el-button>
        <el-button
          type="primary"
          :icon="useRenderIcon(Download)"
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
          @selection-change="rows => (multipleSelection = rows)"
        >
          <!-- 关注列 -->
          <template #favorite="{ row }">
            <el-button
              link
              :type="isFavorite(row.devid) ? 'warning' : 'default'"
              @click.stop="toggleFavorite(row)"
            >
              <el-icon :size="18">
                <component :is="favoriteIcon(row.devid)" />
              </el-icon>
            </el-button>
          </template>

          <!-- 所属分组 -->
          <template #group="{ row }">
            {{ GROUP_MAP[row.type] || row.type }}
          </template>

          <!-- 航行状态 -->
          <template #navstatus="{ row }">
            <el-tag size="small" effect="plain">
              {{ NAV_STATUS_MAP[row.navstatus] || "未知" }}
            </el-tag>
          </template>

          <!-- 在线状态 -->
          <template #onlineStatus="{ row }">
            <el-tag
              size="small"
              :type="onlineTagType(getOnlineStatus(row))"
              effect="plain"
            >
              {{ getOnlineStatus(row) }}
            </el-tag>
          </template>

          <!-- 操作列 -->
          <template #operation="{ row }">
            <el-button
              class="reset-margin"
              link
              type="primary"
              :size="size"
              :icon="useRenderIcon(EditPen)"
              @click="openEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              class="reset-margin"
              link
              type="primary"
              :size="size"
              :icon="useRenderIcon(Setting)"
              @click="goToParamConfig(row)"
            >
              参数配置
            </el-button>
            <el-popconfirm
              :title="`确认删除设备 ${row.devid}？`"
              @confirm="handleDelete(row)"
            >
              <template #reference>
                <el-button
                  class="reset-margin"
                  link
                  type="danger"
                  :size="size"
                  :icon="useRenderIcon(Delete)"
                >
                  删除
                </el-button>
              </template>
            </el-popconfirm>
          </template>
        </pure-table>
      </template>
    </PureTableBar>

    <!-- 添加/编辑弹窗 -->
    <form-dialog
      v-model="dialogVisible"
      :type="dialogType"
      :row="currentRow"
      :exist-list="tableData"
      :on-submit="handleSubmit"
    />
  </div>
</template>
