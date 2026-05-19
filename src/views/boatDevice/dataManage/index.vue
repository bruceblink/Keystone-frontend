<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import Search from "@iconify-icons/ep/search";
import Refresh from "@iconify-icons/ep/refresh";
import AlarmImg from "./components/AlarmImg.vue";
import {
  ALARM_TYPE_LIST,
  GROUP_MAP,
  REGION_MAP,
  MOCK_ALARM_LIST,
  type AlarmRecord,
  type AlarmType
} from "./utils/dict";
import { useBoatStoreHook } from "@/store/modules/boat";

defineOptions({ name: "BoatDataManage" });

const boatStore = useBoatStoreHook();

/* ----- 搜索表单 ----- */
const searchForm = ref({
  alarmType: [] as number[],
  timeRange: [] as string[],
  review: -1,
  projectGroup: "-1"
});

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
const alarmTypeOptions = ref<AlarmType[]>(ALARM_TYPE_LIST);
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

/* ----- 映射表 ----- */
const shipNameMap = computed<Record<string, string>>(() =>
  Object.fromEntries(boatStore.allBoats.map(b => [b.devid, b.shipname_cn]))
);
const alarmTypeNameMap = computed<Record<number, string>>(() =>
  Object.fromEntries(alarmTypeOptions.value.map(i => [i.id, i.des]))
);

/* ----- 表格数据 ----- */
const tableData = ref<AlarmRecord[]>([...MOCK_ALARM_LIST]);
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

const handleSearch = () => {
  const sf = searchForm.value;
  let result = [...MOCK_ALARM_LIST];
  if (sf.projectGroup !== "-1") {
    const devids = boatStore.allBoats
      .filter(b => b.type === sf.projectGroup)
      .map(b => b.devid);
    result = result.filter(r => devids.includes(r.devid));
  }
  if (sf.alarmType.length)
    result = result.filter(r => sf.alarmType.includes(r.alarmtype));
  if (sf.review !== -1) result = result.filter(r => r.review === sf.review);
  if (sf.timeRange.length === 2) {
    const [start, end] = sf.timeRange;
    result = result.filter(r => r.stime >= start && r.stime <= end);
  }
  tableData.value = result;
  currentPage.value = 1;
};

const handleReset = () => {
  searchForm.value = {
    alarmType: [],
    timeRange: [],
    review: -1,
    projectGroup: "-1"
  };
  tableData.value = [...MOCK_ALARM_LIST];
  currentPage.value = 1;
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
    <el-form
      inline
      :model="searchForm"
      class="search-form bg-bg_color w-[99/100] pl-8 pt-[12px]"
    >
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
            v-for="item in GROUP_MAP"
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
          @click="handleSearch"
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

    <!-- 主内容区 -->
    <div class="dm-content">
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
        </div>

        <!-- 表格 -->
        <el-table
          ref="tableRef"
          :data="paginatedTableData"
          border
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
              <el-tag :type="LEVEL_TAG[row.level]" size="small" effect="plain">
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

        <!-- 分页 -->
        <div class="table-footer">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            size="small"
            layout="total, sizes, prev, pager, next, jumper"
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
          :regionMap="REGION_MAP"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@media (width <= 1100px) {
  .dm-content {
    grid-template-columns: 1fr;
  }
}

.dm-page {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.search-form {
  flex-shrink: 0;

  :deep(.el-form-item) {
    margin-bottom: 12px;
  }
}

.dm-content {
  display: grid;
  flex: 1;
  grid-template-columns: minmax(380px, 0.75fr) minmax(0, 1.25fr);
  gap: 12px;
  min-height: 0;
  padding: 0 12px 12px;
}

/* ---- 表格面板 ---- */
.table-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  padding: 12px;
  overflow: hidden;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgb(0 0 0 / 6%);
}

.table-toolbar {
  display: flex;
  flex-shrink: 0;
  gap: 10px;
  align-items: center;
}

.toolbar-total {
  margin-left: auto;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.flex-table {
  flex: 1;
  min-height: 0;
  cursor: pointer;

  :deep(.el-table__body-wrapper) {
    overflow-y: auto;
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
}

.action-bar {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding-top: 4px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.action-center {
  display: flex;
  gap: 8px;
}

/* ---- 图片预览面板 ---- */
.preview-panel {
  min-height: 0;
  overflow: hidden;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgb(0 0 0 / 6%);
}
</style>
