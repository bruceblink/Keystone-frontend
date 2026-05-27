<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import Search from "@iconify-icons/ep/search";
import Refresh from "@iconify-icons/ep/refresh";
import AlarmImg from "./components/AlarmImg.vue";
import { GROUP_OPTIONS, type AlarmRecord } from "./utils/dict";
import { useDataManage } from "./utils/hook";
import { useDraggableMap } from "./utils/map";

defineOptions({ name: "BoatDataManage" });

const {
  searchForm,
  alarmTypeOptions,
  regionMap,
  eleFenceList,
  tableData,
  listLoading,
  shipNameMap,
  alarmTypeNameMap,
  handleSearch,
  handleReset
} = useDataManage();

const processStatusOptions = [
  { label: "全部", value: -1 },
  { label: "未审核", value: 0 },
  { label: "已AI审核", value: 1 },
  { label: "误报", value: 2 },
  { label: "已上传", value: 3 },
  { label: "拖轮", value: 4 },
  { label: "已人工审核", value: 6 }
];

/* ----- 报警类型下拉 ----- */
const alarmTypeSearchQuery = ref("");
const filteredAlarmTypeOptions = computed(() => {
  if (!alarmTypeSearchQuery.value) return alarmTypeOptions.value;
  const q = alarmTypeSearchQuery.value.toLowerCase();
  return alarmTypeOptions.value.filter(item =>
    item.des.toLowerCase().includes(q)
  );
});
const filterAlarmType = (query: string) => {
  alarmTypeSearchQuery.value = query || "";
};

const isAlarmTypeAllChecked = computed(() => {
  const sel = searchForm.value.alarmType;
  const opts = filteredAlarmTypeOptions.value;
  return sel.length === opts.length && opts.length > 0;
});
const isAlarmTypeIndeterminate = computed(() => {
  const sel = searchForm.value.alarmType;
  const opts = filteredAlarmTypeOptions.value;
  return sel.length > 0 && sel.length < opts.length;
});
const handleAlarmTypeCheckAll = (val: boolean) => {
  searchForm.value.alarmType = val
    ? filteredAlarmTypeOptions.value.map(i => i.id)
    : [];
};

/* ----- 表格数据 ----- */
const tableSearchKeyword = ref("");

const filteredTableData = computed(() => {
  const kw = tableSearchKeyword.value.trim().toLowerCase();
  return tableData.value.filter(item => {
    if (!kw) return true;
    const ship = shipNameMap.value[item.devid] || item.devid || "";
    const alarm = alarmTypeNameMap.value[item.reason] || String(item.reason);
    return ship.toLowerCase().includes(kw) || alarm.toLowerCase().includes(kw);
  });
});

const currentPage = ref(1);
const pageSize = ref(20);
const tableDataTotal = computed(() => filteredTableData.value.length);
const totalPages = computed(() =>
  Math.ceil(tableDataTotal.value / pageSize.value)
);

const paginatedTableData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredTableData.value.slice(start, start + pageSize.value);
});

watch(tableSearchKeyword, () => {
  currentPage.value = 1;
});

const handleSizeChange = async (val: number) => {
  pageSize.value = val;
  currentPage.value = 1;
  currentRowIndex.value = null;
  rowData.value = null;
  await nextTick();
  if (paginatedTableData.value.length) {
    rowData.value = paginatedTableData.value[0];
    currentRowIndex.value = 0;
  }
};

/* ----- 行选中 ----- */
const rowData = ref<AlarmRecord | null>(null);
const currentRowIndex = ref<number | null>(null);
const tableRef = ref();

const rowClick = (row: AlarmRecord) => {
  rowData.value = row;
  currentRowIndex.value = paginatedTableData.value.findIndex(
    r => r.uuid === row.uuid
  );
  if (mapVisible.value && mapInstance.value)
    highlightAlarmMarker(row, shipNameMap.value, alarmTypeNameMap.value);
};

const tableRowClassName = ({ row }: { row: AlarmRecord }) =>
  rowData.value?.uuid === row.uuid ? "is-selected-row" : "";

watch(
  paginatedTableData,
  async newVal => {
    if (newVal.length) {
      rowData.value = newVal[0];
      currentRowIndex.value = 0;
      await nextTick();
      tableRef.value?.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      rowData.value = null;
      currentRowIndex.value = null;
    }
  },
  { immediate: true }
);

const scrollToRow = async (rowIndex: number) => {
  await nextTick();
  const body = tableRef.value?.$el?.querySelector(".el-table__body-wrapper");
  if (!body) return;
  const row = body.querySelectorAll("tbody tr")[rowIndex] as HTMLElement;
  if (!row) return;
  const rowTop = row.offsetTop;
  const rowBottom = rowTop + row.offsetHeight;
  if (rowTop < body.scrollTop)
    body.scrollTo({ top: rowTop - 8, behavior: "smooth" });
  else if (rowBottom > body.scrollTop + body.clientHeight)
    body.scrollTo({
      top: rowBottom - body.clientHeight + 8,
      behavior: "smooth"
    });
};

const canClickPrevious = computed(
  () =>
    currentRowIndex.value !== null &&
    (currentRowIndex.value > 0 || currentPage.value > 1)
);
const canClickNext = computed(
  () =>
    currentRowIndex.value !== null &&
    (currentRowIndex.value! < paginatedTableData.value.length - 1 ||
      currentPage.value < totalPages.value)
);

const nextRow = async () => {
  if (currentRowIndex.value! < paginatedTableData.value.length - 1) {
    currentRowIndex.value!++;
    rowData.value = paginatedTableData.value[currentRowIndex.value!];
    await scrollToRow(currentRowIndex.value!);
  } else if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
};

const previousRow = async () => {
  if (currentRowIndex.value! > 0) {
    currentRowIndex.value!--;
    rowData.value = paginatedTableData.value[currentRowIndex.value!];
    await scrollToRow(currentRowIndex.value!);
  } else if (currentPage.value > 1) {
    currentPage.value--;
    await nextTick();
    await nextTick();
    if (paginatedTableData.value.length) {
      const last = paginatedTableData.value.length - 1;
      currentRowIndex.value = last;
      rowData.value = paginatedTableData.value[last];
      await scrollToRow(last);
    }
  }
};

/* ----- 搜索/重置 ----- */
const hasInput = computed(
  () =>
    searchForm.value.alarmType.length > 0 ||
    searchForm.value.timeRange.length > 0 ||
    searchForm.value.review !== -1 ||
    searchForm.value.projectGroup !== "-1"
);

const onSearch = () => {
  currentPage.value = 1;
  handleSearch();
};

/* ----- 操作 ----- */
const uploadLoading = ref(false);

const handleErrorReport = () => {
  ElMessage.warning("误报功能待开发");
};
const handleDispose = () => {
  ElMessage.warning("处置功能待开发");
};

const handleUpload = async () => {
  if (!rowData.value) {
    ElMessage.warning("请先选择一条报警数据");
    return;
  }
  if (rowData.value.review === 3) {
    ElMessage.warning("该报警数据已上传");
    return;
  }
  try {
    await ElMessageBox.confirm("确定上传该报警数据吗？", "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning"
    });
  } catch {
    return;
  }
  uploadLoading.value = true;
  await new Promise(r => setTimeout(r, 800));
  const uuid = rowData.value.uuid;
  const idx = tableData.value.findIndex(r => r.uuid === uuid);
  if (idx !== -1) tableData.value[idx] = { ...tableData.value[idx], review: 3 };
  if (rowData.value) rowData.value = { ...rowData.value, review: 3 };
  ElMessage.success("上传成功");
  uploadLoading.value = false;
};

/* ----- 地图 ----- */
const {
  mapVisible,
  mapRef,
  mapInstance,
  mapPos,
  mapSize,
  isDragging,
  toggleMap,
  onDragStart,
  onResizeStart,
  highlightAlarmMarker,
  clearHighlight,
  drawFences,
  clearFences
} = useDraggableMap({
  zoom: 5,
  center: [121.47, 31.23],
  mapStyle: "amap://styles/normal"
});

watch(mapVisible, val => {
  if (val) {
    nextTick(() => {
      if (rowData.value && mapInstance.value) {
        highlightAlarmMarker(
          rowData.value,
          shipNameMap.value,
          alarmTypeNameMap.value
        );
      }
      if (eleFenceList.value.length && mapInstance.value) {
        drawFences(eleFenceList.value);
      }
    });
  } else {
    clearHighlight();
    clearFences();
  }
});

/* ----- 徽标辅助 ----- */
const LEVEL_TAG: Record<
  number,
  "success" | "warning" | "danger" | "info" | "primary"
> = {
  1: "success",
  2: "warning",
  3: "danger"
};
const LEVEL_LABEL: Record<number, string> = { 1: "一级", 2: "二级", 3: "三级" };
const REVIEW_LABEL: Record<number, string> = {
  0: "未审核",
  1: "已AI审核",
  2: "误报",
  3: "已上传",
  4: "拖轮",
  6: "已人工审核"
};
const REVIEW_TAG: Record<
  number,
  "success" | "warning" | "danger" | "info" | "primary"
> = {
  0: "warning",
  1: "info",
  2: "danger",
  3: "success",
  4: "info",
  6: "primary"
};
</script>

<template>
  <div class="dm-page">
    <!-- 搜索栏 -->
    <el-form inline :model="searchForm" class="search-form bg-bg_color">
      <el-form-item label="报警类型">
        <el-select
          v-model="searchForm.alarmType"
          multiple
          placeholder="请选择报警类型"
          class="!w-[200px]"
          collapse-tags
          collapse-tags-tooltip
          :max-collapse-tags="1"
          filterable
          :filter-method="filterAlarmType"
          clearable
        >
          <template #header v-if="filteredAlarmTypeOptions.length">
            <el-checkbox
              :indeterminate="isAlarmTypeIndeterminate"
              :checked="isAlarmTypeAllChecked"
              @change="handleAlarmTypeCheckAll"
              >全选</el-checkbox
            >
          </template>
          <el-option
            v-for="item in filteredAlarmTypeOptions"
            :key="item.id"
            :label="item.des"
            :value="item.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="项目分组">
        <el-select v-model="searchForm.projectGroup" class="!w-[140px]">
          <el-option
            v-for="item in GROUP_OPTIONS"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="时间段">
        <el-date-picker
          v-model="searchForm.timeRange"
          type="datetimerange"
          range-separator="至"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          class="!w-[360px]"
          value-format="YYYY-MM-DD HH:mm:ss"
          format="YYYY-MM-DD HH:mm:ss"
          unlink-panels
        />
      </el-form-item>
      <el-form-item label="上传状态">
        <el-select v-model="searchForm.review" class="!w-[130px]">
          <el-option
            v-for="item in processStatusOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          :icon="useRenderIcon(Search)"
          @click="onSearch"
          >搜索</el-button
        >
        <el-button
          :icon="useRenderIcon(Refresh)"
          @click="handleReset"
          :disabled="!hasInput"
          >重置</el-button
        >
      </el-form-item>
    </el-form>

    <!-- 主内容区（宽度与上方筛选栏一致） -->
    <div class="dm-content bg-bg_color">
      <!-- 左：表格面板 -->
      <div class="table-panel">
        <!-- 表内搜索 -->
        <div class="table-toolbar">
          <el-input
            v-model="tableSearchKeyword"
            placeholder="搜索船舶 / 报警原因"
            clearable
            class="!w-[220px]"
          >
            <template #prefix>
              <el-icon><component :is="useRenderIcon(Search)" /></el-icon>
            </template>
          </el-input>
          <span class="toolbar-total">共 {{ tableDataTotal }} 条</span>
          <el-button
            size="small"
            :type="mapVisible ? 'primary' : 'default'"
            plain
            @click="toggleMap"
          >
            <template #icon>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                <path
                  d="M7 2L1 5v13l6-3 6 3 6-3V2l-6 3-6-3z"
                  stroke="currentColor"
                  stroke-width="1.4"
                  stroke-linejoin="round"
                />
                <path
                  d="M7 2v13M13 5v13"
                  stroke="currentColor"
                  stroke-width="1.4"
                />
              </svg>
            </template>
            {{ mapVisible ? "关闭地图" : "打开地图" }}
          </el-button>
        </div>

        <!-- 表格 -->
        <div v-loading="listLoading" class="table-wrap">
          <el-table
            ref="tableRef"
            :data="paginatedTableData"
            border
            height="100%"
            class="flex-table"
            :row-class-name="tableRowClassName"
            :header-cell-style="{
              background: 'var(--el-table-row-hover-bg-color)',
              color: 'var(--el-text-color-primary)'
            }"
            @row-click="rowClick"
          >
            <el-table-column
              label="船舶"
              align="center"
              width="110"
              show-overflow-tooltip
            >
              <template #default="{ row }">{{
                shipNameMap[row.devid] || row.devid
              }}</template>
            </el-table-column>
            <el-table-column
              label="报警原因"
              align="center"
              show-overflow-tooltip
            >
              <template #default="{ row }">{{
                alarmTypeNameMap[row.reason] || row.reason
              }}</template>
            </el-table-column>
            <el-table-column label="等级" align="center" width="90">
              <template #default="{ row }">
                <el-tag
                  :type="LEVEL_TAG[row.level]"
                  size="small"
                  effect="plain"
                >
                  {{ LEVEL_LABEL[row.level] ?? "--" }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="上传状态" align="center" width="110">
              <template #default="{ row }">
                <el-tag
                  :type="REVIEW_TAG[row.review]"
                  size="small"
                  effect="plain"
                >
                  {{ REVIEW_LABEL[row.review] ?? "未知" }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              label="时间"
              align="center"
              width="160"
              show-overflow-tooltip
            >
              <template #default="{ row }">{{ row.stime || "--" }}</template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 分页 -->
        <div class="table-footer">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            size="small"
            layout="total, sizes, prev, pager, next"
            :total="tableDataTotal"
            :pager-count="5"
            @size-change="handleSizeChange"
            @current-change="(v: number) => (currentPage = v)"
          />
        </div>

        <!-- 操作按钮 -->
        <div class="action-bar">
          <el-button
            size="small"
            :disabled="!canClickPrevious"
            @click="previousRow"
            >上一条</el-button
          >
          <div class="action-center">
            <el-button size="small" type="info" plain @click="handleErrorReport"
              >误报</el-button
            >
            <el-button size="small" type="primary" plain @click="handleDispose"
              >处置</el-button
            >
            <el-button
              size="small"
              type="success"
              :loading="uploadLoading"
              @click="handleUpload"
              >上传</el-button
            >
          </div>
          <el-button size="small" :disabled="!canClickNext" @click="nextRow"
            >下一条</el-button
          >
        </div>
      </div>

      <!-- 右：图片预览面板 -->
      <div class="preview-panel">
        <AlarmImg
          :rowData="rowData"
          :alarmTypeNameMap="alarmTypeNameMap"
          :shipNameMap="shipNameMap"
          :regionMap="regionMap"
        />
      </div>
    </div>

    <!-- 可拖动地图面板（teleport 到 body，位于单根元素内避免 Fragment 警告） -->
    <teleport to="body">
      <transition name="map-fade">
        <div
          v-show="mapVisible"
          class="map-panel"
          :style="{
            left: mapPos.x + 'px',
            top: mapPos.y + 'px',
            width: mapSize.w + 'px',
            height: mapSize.h + 'px',
            cursor: isDragging ? 'grabbing' : 'default'
          }"
        >
          <div class="map-panel__header" @mousedown="onDragStart">
            <div class="map-panel__header-left">
              <span class="map-panel__dot" />
              <span class="map-panel__title">地图</span>
              <span class="map-panel__sub">AMap · 高德地图</span>
            </div>
            <button class="map-panel__close" @click="mapVisible = false">
              ×
            </button>
          </div>
          <div ref="mapRef" class="map-panel__body" />
          <div class="map-panel__resize" @mousedown="onResizeStart" />
        </div>
      </transition>
    </teleport>
  </div>
</template>

<style lang="scss">
@keyframes map-dot-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgb(94 231 255 / 0%);
  }

  50% {
    box-shadow: 0 0 6px 2px rgb(94 231 255 / 40%);
  }
}

@keyframes map-enter {
  from {
    opacity: 0;
    transform: scale(0.94) translateY(10px);
  }

  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.map-fade-enter-active {
  animation: map-enter 0.28s cubic-bezier(0.22, 0.61, 0.36, 1);
}

.map-fade-leave-active {
  animation: map-enter 0.2s cubic-bezier(0.22, 0.61, 0.36, 1) reverse;
}

.map-panel {
  position: fixed;
  z-index: 9000;
  display: flex;
  flex-direction: column;
  min-width: 320px;
  min-height: 240px;
  overflow: hidden;
  user-select: none;
  background: rgb(3 12 32 / 96%);
  border: 1px solid rgb(82 188 255 / 22%);
  border-radius: 12px;
  box-shadow: 0 24px 60px rgb(0 0 0 / 55%), 0 0 32px rgb(38 180 255 / 8%);
}

.map-panel__header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  cursor: grab;
  background: rgb(6 22 56 / 96%);
  border-bottom: 1px solid rgb(82 188 255 / 16%);

  &:active {
    cursor: grabbing;
  }
}

.map-panel__header-left {
  display: flex;
  gap: 8px;
  align-items: center;
}

.map-panel__dot {
  flex-shrink: 0;
  width: 7px;
  height: 7px;
  background: #5ee7ff;
  border-radius: 50%;
  animation: map-dot-pulse 2.4s ease-in-out infinite;
}

.map-panel__title {
  font-size: 13px;
  font-weight: 700;
  color: #e8f4ff;
  letter-spacing: 0.04em;
}

.map-panel__sub {
  font-family: "Courier New", monospace;
  font-size: 11px;
  color: rgb(160 200 240 / 50%);
  letter-spacing: 0.06em;
}

.map-panel__close {
  padding: 0 2px;
  font-size: 18px;
  line-height: 1;
  color: rgb(160 200 240 / 55%);
  cursor: pointer;
  background: transparent;
  border: none;
  transition: color 0.15s;

  &:hover {
    color: #5ee7ff;
  }
}

.map-panel__body {
  flex: 1;
  width: 100%;
  min-height: 0;
}

.map-panel__resize {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 18px;
  height: 18px;
  cursor: nwse-resize;
  background: linear-gradient(
    135deg,
    transparent 50%,
    rgb(94 231 255 / 25%) 50%
  );
  border-radius: 0 0 12px;

  &:hover {
    background: linear-gradient(
      135deg,
      transparent 50%,
      rgb(94 231 255 / 50%) 50%
    );
  }
}

/* 地图面板（teleport 到 body，非 scoped） */

/* 数据管理页：锁定视口（main-content 与 dm-page 在同一根节点，不能用 :has） */
.app-main:has(.dm-page) {
  width: 100%;
  max-width: 100%;
  overflow: hidden;
}

.app-main:has(.dm-page) .el-scrollbar {
  width: 100% !important;
  max-width: 100% !important;
}

.app-main:has(.dm-page) .el-scrollbar__wrap,
.app-main:has(.dm-page) .el-scrollbar__view {
  width: 100% !important;
  max-width: 100% !important;
  overflow-x: hidden !important;
}

.app-main:has(.dm-page) .el-scrollbar__wrap {
  overflow-y: hidden !important;
}

.app-main:has(.dm-page) .el-scrollbar__view {
  display: flex !important;
  flex-direction: column !important;
  min-width: 0 !important;
}

.app-main .dm-page {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  height: calc(100vh - 85px);
  padding: 12px 24px 16px;
  margin: 0 !important;
  overflow: hidden;
}
</style>

<style scoped lang="scss">
@media (width <= 1100px) {
  .dm-content {
    flex-direction: column;
  }

  .table-panel,
  .preview-panel {
    flex: 1 1 0 !important;
  }
}

.dm-page {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  min-height: 0;
  overflow: hidden;
}

.search-form {
  flex-shrink: 0;
  width: 100%;
  max-width: 100%;
  padding-top: 12px;
  overflow: hidden;

  :deep(.el-form--inline) {
    display: flex;
    flex-wrap: wrap;
    gap: 0 4px;
  }

  :deep(.el-form-item) {
    margin-right: 12px;
    margin-bottom: 12px;
  }

  :deep(.el-date-editor),
  :deep(.el-select),
  :deep(.el-input) {
    max-width: 100%;
  }
}

.dm-content {
  box-sizing: border-box;
  display: flex;
  flex: 1;
  gap: 12px;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  min-height: 0;
  overflow: hidden;
}

/* ---- 表格面板 ---- */
.table-panel {
  display: flex;
  flex: 3 1 0;
  flex-direction: column;
  gap: 8px;
  width: 0;
  min-width: 0;
  min-height: 0;
  padding: 12px;
  overflow: hidden;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgb(0 0 0 / 6%);
}

.table-wrap {
  flex: 1;
  width: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.table-toolbar {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.toolbar-total {
  margin-left: auto;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.flex-table {
  width: 100% !important;
  max-width: 100%;
  cursor: pointer;

  :deep(.el-table__inner-wrapper) {
    width: 100% !important;
    min-width: 0 !important;
  }

  :deep(table) {
    width: 100% !important;
    table-layout: fixed;
  }

  :deep(.el-table__header-wrapper),
  :deep(.el-table__body-wrapper) {
    width: 100% !important;
    overflow-x: hidden;
  }

  :deep(.el-table__header),
  :deep(.el-table__body) {
    width: 100% !important;
  }

  :deep(.is-selected-row td) {
    background: var(--el-color-primary-light-9) !important;
  }

  :deep(.el-table__row) {
    cursor: pointer;
  }
}

.table-footer {
  display: flex;
  flex-shrink: 0;
  justify-content: center;
  width: 100%;
  min-width: 0;
  overflow: hidden;

  :deep(.el-pagination) {
    flex-wrap: wrap;
    justify-content: center;
  }
}

.action-bar {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-width: 0;
  padding-top: 4px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.action-center {
  display: flex;
  gap: 8px;
}

/* ---- 图片预览面板 ---- */
.preview-panel {
  display: flex;
  flex: 5 1 0;
  flex-direction: column;
  width: 0;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgb(0 0 0 / 6%);
}
</style>
