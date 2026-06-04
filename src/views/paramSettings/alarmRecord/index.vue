<script setup lang="ts">
import { toRef, onMounted, computed } from "vue";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import Search from "@iconify-icons/ep/search";
import Refresh from "@iconify-icons/ep/refresh";
import Delete from "@iconify-icons/ep/delete";
import { useBoatStoreHook } from "@/store/modules/boat";
import { useAlarmRecord } from "./utils";
import AlarmDetailPanel from "./components/AlarmDetailPanel.vue";
import { ALARM_STATUS_OPTIONS, formatCoord } from "./utils/dict";
import type { AlarmRecordItem } from "./utils/types";

defineOptions({ name: "ParamAlarmRecord" });

const boatStore = useBoatStoreHook();
const boatId = toRef(boatStore, "selectedBoatId");

const {
  searchFormRef,
  searchForm,
  rules,
  alarmTypeOptions,
  alarmTypeMap,
  isAllAlarmTypeChecked,
  isAlarmTypeIndeterminate,
  handleCheckAllAlarmType,
  disabledStartDate,
  disabledEndDate,
  handleSearch,
  resetForm,
  listSearchQuery,
  loading,
  dataList,
  filteredTableData,
  pagination,
  shouldShowEmpty,
  selectedRow,
  mediaList,
  handleRowClick,
  handleDelete,
  getWaterRegionName,
  getDutyLevelText,
  ALARM_STATE_MAP,
  showImagePreview,
  previewImageUrl,
  currentImageIndex,
  imageList,
  openImagePreview,
  closeImagePreview,
  prevImage,
  nextImage
} = useAlarmRecord(boatId);

const selectedAlarmLabel = computed(() =>
  selectedRow.value
    ? alarmTypeMap.value[selectedRow.value.alarmtype] ||
      selectedRow.value.alarmtype
    : ""
);

const selectedRegionName = computed(() =>
  selectedRow.value ? getWaterRegionName(selectedRow.value.region) : "—"
);

const stateTagType = (state: number) => {
  if (state === 1) return "success";
  if (state === 2) return "info";
  return "warning";
};

onMounted(() => {
  boatStore.fetchBoatList();
});
</script>

<template>
  <div class="main alarm-record-page">
    <!-- 船只选择 -->
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
        title="请先选择船只，再查询该船的报警记录"
        type="warning"
        :closable="false"
        class="!py-1 !w-auto"
      />
    </div>

    <!-- 筛选条件 -->
    <el-form
      ref="searchFormRef"
      :model="searchForm"
      :rules="rules"
      :disabled="!boatStore.selectedBoatId"
      class="filter-form bg-bg_color w-[99/100] pl-8 pt-[12px] pb-[8px]"
      label-width="80px"
    >
      <el-row :gutter="16">
        <el-col :xs="24" :sm="12" :md="6">
          <el-form-item label="报警原因">
            <el-select
              v-model="searchForm.alarmType"
              multiple
              collapse-tags
              collapse-tags-tooltip
              placeholder="请选择报警原因"
              class="w-full"
            >
              <template #header>
                <el-checkbox
                  :model-value="isAllAlarmTypeChecked"
                  :indeterminate="isAlarmTypeIndeterminate"
                  @change="handleCheckAllAlarmType"
                >
                  全选
                </el-checkbox>
              </template>
              <el-option
                v-for="opt in alarmTypeOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12" :md="5">
          <el-form-item label="开始时间" prop="startTime">
            <el-date-picker
              v-model="searchForm.startTime"
              type="datetime"
              placeholder="选择开始时间"
              value-format="YYYY-MM-DD HH:mm:ss"
              format="YYYY-MM-DD HH:mm:ss"
              :disabled-date="disabledStartDate"
              class="w-full"
            />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12" :md="5">
          <el-form-item label="结束时间" prop="endTime">
            <el-date-picker
              v-model="searchForm.endTime"
              type="datetime"
              placeholder="选择结束时间"
              value-format="YYYY-MM-DD HH:mm:ss"
              format="YYYY-MM-DD HH:mm:ss"
              :disabled-date="disabledEndDate"
              class="w-full"
            />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12" :md="4">
          <el-form-item label="状态">
            <el-select
              v-model="searchForm.status"
              placeholder="状态"
              class="w-full"
            >
              <el-option
                v-for="opt in ALARM_STATUS_OPTIONS"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12" :md="4" class="filter-actions">
          <el-button
            type="primary"
            :icon="useRenderIcon(Search)"
            @click="handleSearch"
          >
            筛选
          </el-button>
          <el-button :icon="useRenderIcon(Refresh)" @click="resetForm">
            重置
          </el-button>
        </el-col>
      </el-row>
    </el-form>

    <!-- 主内容：列表 + 详情（宽度与上方筛选栏一致） -->
    <div class="record-body bg-bg_color w-[99/100] pl-8 pr-8 pb-4">
      <div class="record-layout">
        <div class="record-list panel-card">
          <div class="list-toolbar">
            <el-input
              v-model="listSearchQuery"
              placeholder="搜索报警原因/设备编号/事件地点/所属水域"
              clearable
              :prefix-icon="useRenderIcon(Search)"
              class="flex-1"
            />
            <span class="list-total">共 {{ filteredTableData.length }} 条</span>
          </div>

          <div v-loading="loading" class="list-table-wrap">
            <el-empty
              v-if="shouldShowEmpty"
              description="暂无报警数据"
              class="list-empty"
            />
            <el-table
              v-else
              :data="dataList"
              border
              highlight-current-row
              height="100%"
              row-key="sid"
              :current-row-key="selectedRow?.sid"
              @row-click="(row: AlarmRecordItem) => handleRowClick(row)"
            >
              <el-table-column type="selection" width="48" align="center" />
              <el-table-column
                prop="camid"
                label="设备编号"
                width="120"
                show-overflow-tooltip
              />
              <el-table-column
                label="报警原因"
                min-width="120"
                show-overflow-tooltip
              >
                <template #default="{ row }">
                  {{ alarmTypeMap[row.alarmtype] || row.alarmtype || "—" }}
                </template>
              </el-table-column>
              <el-table-column
                label="水域类型"
                width="100"
                show-overflow-tooltip
              >
                <template #default="{ row }">
                  {{ getWaterRegionName(row.region) }}
                </template>
              </el-table-column>
              <el-table-column
                prop="stime"
                label="时间"
                min-width="160"
                show-overflow-tooltip
              />
              <el-table-column label="处理状态" width="100" align="center">
                <template #default="{ row }">
                  <el-tag :type="stateTagType(row.state)" size="small">
                    {{ ALARM_STATE_MAP[row.state] ?? "未知" }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column
                label="操作"
                width="80"
                align="center"
                fixed="right"
              >
                <template #default="{ row }">
                  <el-button
                    link
                    type="danger"
                    :icon="useRenderIcon(Delete)"
                    @click.stop="handleDelete(row)"
                  />
                </template>
              </el-table-column>
            </el-table>
          </div>

          <el-pagination
            v-if="!shouldShowEmpty && filteredTableData.length"
            v-model:current-page="pagination.currentPage"
            v-model:page-size="pagination.pageSize"
            class="list-pagination"
            background
            layout="total, sizes, prev, pager, next"
            :total="pagination.total"
            :page-sizes="[20, 50, 100, 120]"
          />
        </div>

        <div class="record-detail panel-card">
          <AlarmDetailPanel
            :row="selectedRow"
            :media-list="mediaList"
            :alarm-type-label="selectedAlarmLabel"
            :region-name="selectedRegionName"
            :get-duty-level-text="getDutyLevelText"
            :format-coord="formatCoord"
            @preview="openImagePreview"
          />
        </div>
      </div>
    </div>

    <!-- 图片预览 -->
    <Teleport to="body">
      <div
        v-if="showImagePreview"
        class="image-preview-overlay"
        @click="closeImagePreview"
      >
        <div class="image-preview-box" @click.stop>
          <button
            v-if="imageList.length > 1"
            type="button"
            class="nav-btn"
            @click="prevImage"
          >
            ‹
          </button>
          <img :src="previewImageUrl" class="preview-img" alt="预览" />
          <button
            v-if="imageList.length > 1"
            type="button"
            class="nav-btn nav-btn--next"
            @click="nextImage"
          >
            ›
          </button>
          <button type="button" class="close-btn" @click="closeImagePreview">
            ×
          </button>
          <div v-if="imageList.length > 1" class="image-counter">
            {{ currentImageIndex + 1 }} / {{ imageList.length }}
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
.alarm-record-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: calc(100vh - 120px);
}

.boat-selector-bar {
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.filter-form {
  border-bottom: 1px solid var(--el-border-color-lighter);

  :deep(.el-form-item) {
    margin-bottom: 12px;
  }
}

.filter-actions {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  padding-bottom: 12px;
}

.record-body {
  box-sizing: border-box;
  display: flex;
  flex: 1;
  flex-direction: column;
  width: 100%;
  min-height: 0;
}

.record-layout {
  box-sizing: border-box;
  display: flex;
  flex: 1;
  gap: 12px;
  width: 100%;
  height: calc(100vh - 280px);
  min-height: 560px;
}

.panel-card {
  overflow: hidden;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
}

.record-list,
.record-detail {
  display: flex;
  flex: 1 1 50%;
  flex-direction: column;
  width: 50%;
  min-width: 0;
  padding: 12px;
}

.list-toolbar {
  display: flex;
  flex-shrink: 0;
  gap: 12px;
  align-items: center;
  margin-bottom: 10px;
}

.list-total {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.list-table-wrap {
  flex: 1;
  min-height: 0;
}

.list-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.list-pagination {
  flex-shrink: 0;
  justify-content: flex-end;
  margin-top: 10px;
}

.image-preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: rgb(0 0 0 / 88%);
}

.image-preview-box {
  position: relative;
  max-width: 92vw;
  max-height: 92vh;
}

.preview-img {
  max-width: 90vw;
  max-height: 85vh;
  cursor: default;
  object-fit: contain;
  border-radius: 4px;
}

.close-btn {
  position: absolute;
  top: -40px;
  right: 0;
  width: 36px;
  height: 36px;
  font-size: 22px;
  color: #fff;
  cursor: pointer;
  background: rgb(255 255 255 / 20%);
  border: none;
  border-radius: 50%;
}

.nav-btn {
  position: absolute;
  top: 50%;
  width: 44px;
  height: 44px;
  font-size: 28px;
  color: #fff;
  cursor: pointer;
  background: rgb(255 255 255 / 15%);
  border: none;
  border-radius: 50%;
  transform: translateY(-50%);

  &--next {
    right: -56px;
  }

  &:first-of-type {
    left: -56px;
  }
}

.image-counter {
  position: absolute;
  bottom: -32px;
  left: 50%;
  padding: 4px 14px;
  font-size: 13px;
  color: #fff;
  background: rgb(0 0 0 / 50%);
  border-radius: 16px;
  transform: translateX(-50%);
}

@media (width <= 1200px) {
  .record-layout {
    flex-direction: column;
    height: auto;
  }

  .record-list,
  .record-detail {
    flex: none;
    width: 100%;
    min-height: 360px;
  }
}
</style>
