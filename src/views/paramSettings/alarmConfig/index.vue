<script setup lang="ts">
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import Search from "@iconify-icons/ep/search";
import View from "@iconify-icons/ep/view";
import ArrowLeft from "@iconify-icons/ep/arrow-left";
import { toRef } from "vue";
import { useAlarmConfigList } from "./utils";
import { useBoatStoreHook } from "@/store/modules/boat";
import AlarmDetail from "./components/AlarmDetail.vue";

defineOptions({ name: "ParamAlarmConfig" });

const boatStore = useBoatStoreHook();

const {
  searchQuery,
  onSearch,
  dataList,
  pagination,
  configuredCount,
  unconfiguredCount,
  showDetail,
  currentAlarmType,
  handleViewDetail,
  handleBack,
  columns
} = useAlarmConfigList(toRef(boatStore, "selectedBoatId"));
</script>

<template>
  <div class="flex flex-col w-full h-full overflow-hidden pr-10">
    <!-- ========== 列表视图 ========== -->
    <template v-if="!showDetail">
      <!-- 船只选择器 -->
      <div
        class="bg-bg_color pl-8 pt-[12px] pb-[12px] flex items-center gap-4 border-b border-[var(--el-border-color-lighter)] shrink-0"
      >
        <span class="text-sm font-medium text-text_color_regular"
          >当前船只：</span
        >
        <el-select
          :model-value="boatStore.selectedBoatId"
          placeholder="请选择船只"
          clearable
          filterable
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
          title="请先选择船只，再查看或编辑报警配置"
          type="warning"
          :closable="false"
          class="!py-1 !w-auto"
        />
        <div
          v-if="boatStore.selectedBoatId"
          class="flex items-center gap-[14px] ml-auto"
        >
          <span
            class="flex items-center gap-[5px] text-xs text-[var(--el-text-color-secondary)] whitespace-nowrap"
          >
            <i
              class="inline-block w-[7px] h-[7px] rounded-full shrink-0 bg-[var(--el-color-primary-light-3)]"
            />全部 {{ dataList.length }}
          </span>
          <span
            class="flex items-center gap-[5px] text-xs text-[var(--el-text-color-secondary)] whitespace-nowrap"
          >
            <i
              class="inline-block w-[7px] h-[7px] rounded-full shrink-0 bg-[var(--el-color-success)]"
              :style="{ boxShadow: '0 0 4px var(--el-color-success)' }"
            />已配置 {{ configuredCount }}
          </span>
          <span
            class="flex items-center gap-[5px] text-xs text-[var(--el-text-color-secondary)] whitespace-nowrap"
          >
            <i
              class="inline-block w-[7px] h-[7px] rounded-full shrink-0 bg-[var(--el-color-warning)]"
              :style="{ boxShadow: '0 0 4px var(--el-color-warning)' }"
            />待配置 {{ unconfiguredCount }}
          </span>
        </div>
      </div>

      <!-- 未选船只时：空状态占位 -->
      <div
        v-if="!boatStore.selectedBoatId"
        class="flex-1 flex items-center justify-center"
      >
        <el-empty
          description="请先选择船只，以查看该船的报警配置"
          :image-size="120"
        />
      </div>

      <!-- 已选船只：搜索 + 表格 -->
      <template v-else>
        <el-form inline class="search-form bg-bg_color pl-8 pt-[12px]">
          <el-form-item>
            <el-input
              v-model="searchQuery"
              placeholder="搜索报警编号 / 名称"
              clearable
              class="!w-[280px]"
              @input="onSearch"
            >
              <template #prefix>
                <el-icon><component :is="useRenderIcon(Search)" /></el-icon>
              </template>
            </el-input>
          </el-form-item>
        </el-form>

        <PureTableBar title="报警规则配置" :columns="columns">
          <template v-slot="{ size, dynamicColumns }">
            <pure-table
              border
              align-whole="center"
              show-overflow-tooltip
              table-layout="auto"
              :size="size"
              row-key="_id"
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
            >
              <template #configured="{ row }">
                <el-tag
                  :type="row.configured ? 'success' : 'warning'"
                  size="small"
                >
                  {{ row.configured ? "已配置" : "未配置" }}
                </el-tag>
              </template>
              <template #operation="{ row }">
                <el-button
                  link
                  type="primary"
                  :size="size"
                  :icon="useRenderIcon(View)"
                  @click="handleViewDetail(row)"
                >
                  查看详情
                </el-button>
              </template>
            </pure-table>
          </template>
        </PureTableBar>
      </template>
    </template>

    <!-- ========== 详情视图 ========== -->
    <template v-else-if="currentAlarmType">
      <!-- 顶栏 -->
      <div
        class="flex items-center gap-[10px] px-4 py-[10px] border-b border-[var(--el-border-color-lighter)] shrink-0 bg-bg_color"
      >
        <el-button
          :icon="useRenderIcon(ArrowLeft)"
          size="small"
          @click="handleBack"
        >
          返回列表
        </el-button>
        <el-divider direction="vertical" />
        <el-tag type="info" size="small" class="!font-mono !font-bold"
          >#{{ currentAlarmType.id }}</el-tag
        >
        <span
          class="text-sm font-semibold text-[var(--el-text-color-primary)]"
          >{{ currentAlarmType.des }}</span
        >
      </div>

      <!-- 详情内容（撑满剩余高度） -->
      <div class="flex-1 min-h-0 overflow-hidden py-3 px-4 flex flex-col">
        <AlarmDetail
          :alarm-type="currentAlarmType"
          :boat-id="boatStore.selectedBoatId"
          @back="handleBack"
        />
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.search-form {
  flex-shrink: 0;

  :deep(.el-form-item) {
    margin-bottom: 12px;
  }
}
</style>
