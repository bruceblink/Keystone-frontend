<script setup lang="ts">
import dayjs from "dayjs";
import { onMounted, reactive, ref, toRaw } from "vue";
import { type PaginationProps } from "@pureadmin/table";
import { type Sort } from "element-plus";
import { CommonUtils } from "@/utils/common";
import {
  getJobLogListApi,
  type JobDTO,
  type JobLogDTO
} from "@/api/system/job";

interface FormProps {
  job: JobDTO;
}

const props = defineProps<FormProps>();

const defaultSort: Sort = {
  prop: "startTime",
  order: "descending"
};

const searchFormParams = reactive({
  jobId: props.job.jobId,
  orderColumn: defaultSort.prop,
  orderDirection: defaultSort.order
});

const pagination = reactive<PaginationProps>({
  total: 0,
  pageSize: 10,
  currentPage: 1,
  background: true
});

const loading = ref(false);
const dataList = ref<JobLogDTO[]>([]);

const columns: TableColumnList = [
  {
    label: "日志编号",
    prop: "jobLogId",
    minWidth: 100
  },
  {
    label: "触发方式",
    prop: "triggerType",
    minWidth: 110,
    slot: "triggerType"
  },
  {
    label: "执行状态",
    prop: "status",
    minWidth: 100,
    slot: "status"
  },
  {
    label: "开始时间",
    prop: "startTime",
    sortable: "custom",
    minWidth: 180,
    formatter: ({ startTime }) =>
      startTime ? dayjs(startTime).format("YYYY-MM-DD HH:mm:ss") : "-"
  },
  {
    label: "耗时(ms)",
    prop: "durationMs",
    minWidth: 100
  },
  {
    label: "日志信息",
    prop: "jobMessage",
    minWidth: 180
  },
  {
    label: "异常信息",
    prop: "exceptionInfo",
    minWidth: 260
  }
];

function statusTagType(status?: number) {
  if (status === 1) return "success";
  if (status === 2) return "warning";
  if (status === 0) return "danger";
  return "info";
}

function triggerTagType(triggerType?: number) {
  return triggerType === 2 ? "success" : "primary";
}

async function getJobLogs(sort = defaultSort) {
  CommonUtils.fillSortParams(searchFormParams, sort);
  CommonUtils.fillPaginationParams(searchFormParams, pagination);

  loading.value = true;
  const { data } = await getJobLogListApi(toRaw(searchFormParams)).finally(
    () => {
      loading.value = false;
    }
  );
  dataList.value = data.rows;
  pagination.total = data.total;
}

onMounted(() => {
  getJobLogs();
});
</script>

<template>
  <div class="job-log">
    <div class="job-log__header">
      <span class="job-log__title">{{ props.job.jobName }}</span>
      <span class="job-log__target">{{ props.job.invokeTarget }}</span>
      <el-button size="small" @click="getJobLogs()">刷新</el-button>
    </div>
    <div class="job-log__table">
      <pure-table
        border
        align-whole="center"
        showOverflowTooltip
        table-layout="auto"
        :loading="loading"
        :data="dataList"
        :columns="columns"
        :default-sort="defaultSort"
        :pagination="pagination"
        @page-size-change="getJobLogs"
        @page-current-change="getJobLogs"
        @sort-change="getJobLogs"
      >
        <template #triggerType="{ row }">
          <el-tag :type="triggerTagType(row.triggerType)" effect="plain">
            {{ row.triggerTypeStr || "-" }}
          </el-tag>
        </template>
        <template #status="{ row }">
          <el-tag :type="statusTagType(row.status)" effect="plain">
            {{ row.statusStr || "-" }}
          </el-tag>
        </template>
      </pure-table>
    </div>
  </div>
</template>

<style scoped>
.job-log {
  display: flex;
  flex-direction: column;
  height: 520px;
  min-height: 420px;
}

.job-log__header {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}

.job-log__title {
  font-weight: 600;
}

.job-log__target {
  flex: 1;
  overflow: hidden;
  color: var(--el-text-color-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.job-log__table {
  flex: 1;
  min-height: 0;
}

.job-log__table :deep(.pure-table) {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.job-log__table :deep(.el-table) {
  flex: 1;
}

.job-log__table :deep(.pure-pagination) {
  display: flex;
  flex: none;
  justify-content: flex-end;
  padding-top: 16px;
  margin-top: auto;
}
</style>
