import dayjs from "dayjs";
import editForm from "../form.vue";
import jobLog from "../log.vue";
import { addDialog } from "@/components/ReDialog";
import { message } from "@/utils/message";
import { CommonUtils } from "@/utils/common";
import { type PaginationProps } from "@pureadmin/table";
import { ElMessageBox, Sort, type FormInstance } from "element-plus";
import { h, onMounted, reactive, ref, toRaw } from "vue";
import { useSystemDict } from "@/views/system/utils/dict";
import {
  addJobApi,
  deleteJobApi,
  getJobInvokeTargetsApi,
  getJobListApi,
  runJobApi,
  updateJobApi,
  updateJobStatusApi
} from "@/api/system/job";
import type {
  JobDTO,
  JobInvokeTargetDTO,
  JobQuery,
  JobRequest
} from "@/api/system/job";

type JobRow = JobDTO & {
  jobId: number;
  status: number;
};

type TableRef = {
  getTableRef: () => {
    clearSort: () => void;
    clearSelection: () => void;
  };
};

type DoneFn = Function;

type EditFormRef = {
  getFormRuleRef: () => {
    validate: (cb: (valid: boolean) => void) => void;
  };
};

const statusMap = useSystemDict("sysJob.status").map;
const yesOrNoMap = useSystemDict("common.yesOrNo").map;

export function useJobHook() {
  const defaultSort: Sort = {
    prop: "createTime",
    order: "descending"
  };

  const pagination: PaginationProps = {
    total: 0,
    pageSize: 10,
    currentPage: 1,
    background: true
  };

  const searchFormParams = reactive<JobQuery>({
    jobName: undefined,
    jobGroup: undefined,
    status: undefined,
    orderColumn: defaultSort.prop,
    orderDirection: defaultSort.order
  });

  const formRef = ref<EditFormRef>();
  const dataList = ref<JobRow[]>([]);
  const invokeTargetOptions = ref<JobInvokeTargetDTO[]>([]);
  const pageLoading = ref(true);
  const multipleSelection = ref<number[]>([]);

  const columns: TableColumnList = [
    {
      type: "selection",
      align: "left"
    },
    {
      label: "任务编号",
      prop: "jobId",
      minWidth: 100
    },
    {
      label: "任务名称",
      prop: "jobName",
      minWidth: 140
    },
    {
      label: "任务组",
      prop: "jobGroup",
      minWidth: 120
    },
    {
      label: "调用目标",
      prop: "invokeTarget",
      minWidth: 220
    },
    {
      label: "Cron表达式",
      prop: "cronExpression",
      minWidth: 160
    },
    {
      label: "并发",
      prop: "concurrent",
      minWidth: 90,
      cellRenderer: ({ row, props }) => {
        const yesOrNo = yesOrNoMap.value[row.concurrent] ?? {
          cssTag: "info",
          label: String(row.concurrent ?? "-")
        };
        return (
          <el-tag size={props.size} type={yesOrNo.cssTag} effect="plain">
            {yesOrNo.label}
          </el-tag>
        );
      }
    },
    {
      label: "状态",
      prop: "status",
      minWidth: 110,
      cellRenderer: ({ row, props }) => {
        const status = statusMap.value[row.status] ?? {
          cssTag: "info",
          label: String(row.status ?? "-")
        };
        return (
          <el-tag size={props.size} type={status.cssTag} effect="plain">
            {status.label}
          </el-tag>
        );
      }
    },
    {
      label: "创建时间",
      prop: "createTime",
      sortable: "custom",
      minWidth: 180,
      formatter: ({ createTime }) =>
        createTime ? dayjs(createTime).format("YYYY-MM-DD HH:mm:ss") : "-"
    },
    {
      label: "操作",
      fixed: "right",
      width: 260,
      slot: "operation"
    }
  ];

  function onSearch() {
    pagination.currentPage = 1;
    getJobList();
  }

  function resetForm(formEl: FormInstance | undefined, tableRef: TableRef) {
    if (!formEl) return;
    formEl.resetFields();
    searchFormParams.orderColumn = undefined;
    searchFormParams.orderDirection = undefined;
    tableRef.getTableRef().clearSort();
    onSearch();
  }

  async function getJobList(sort: Sort = defaultSort) {
    CommonUtils.fillSortParams(searchFormParams, sort);
    CommonUtils.fillPaginationParams(searchFormParams, pagination);

    pageLoading.value = true;
    const { data } = await getJobListApi(toRaw(searchFormParams)).finally(
      () => {
        pageLoading.value = false;
      }
    );
    dataList.value = data.rows as JobRow[];
    pagination.total = data.total;
  }

  async function loadInvokeTargetOptions() {
    const { data } = await getJobInvokeTargetsApi();
    invokeTargetOptions.value = data ?? [];
  }

  async function openDialog(title = "新增", row?: JobDTO) {
    await loadInvokeTargetOptions();

    const formInline: JobRequest = {
      jobName: row?.jobName ?? "",
      jobGroup: row?.jobGroup ?? "DEFAULT",
      invokeTarget: row?.invokeTarget ?? "",
      cronExpression: row?.cronExpression ?? "",
      concurrent: row?.concurrent ?? 0,
      status: row?.status ?? 0,
      remark: row?.remark ?? ""
    };

    addDialog({
      title: `${title}定时任务`,
      props: {
        formInline,
        invokeTargetOptions: invokeTargetOptions.value
      },
      width: "44%",
      draggable: true,
      fullscreenIcon: true,
      closeOnClickModal: false,
      contentRenderer: () =>
        h(editForm, {
          ref: formRef,
          formInline,
          invokeTargetOptions: invokeTargetOptions.value
        }),
      beforeSure: (done, { options }) => {
        const curData = options.props.formInline as JobRequest;
        formRef.value.getFormRuleRef().validate(valid => {
          if (!valid) return;
          if (title === "新增") {
            handleAdd(curData, done);
          } else {
            handleUpdate(row.jobId, curData, done);
          }
        });
      }
    });
  }

  async function handleAdd(row: JobRequest, done: DoneFn) {
    await addJobApi(row).then(() => {
      message(`您新增了定时任务：${row.jobName}`, { type: "success" });
      done();
      getJobList();
    });
  }

  async function handleUpdate(jobId: number, row: JobRequest, done: DoneFn) {
    await updateJobApi(jobId, row).then(() => {
      message(`您更新了定时任务：${row.jobName}`, { type: "success" });
      done();
      getJobList();
    });
  }

  async function handleDelete(row: JobRow) {
    await ElMessageBox.confirm(
      `确认删除定时任务 ${row.jobName} 吗？`,
      "系统提示",
      { type: "warning", draggable: true }
    );
    await deleteJobApi([row.jobId]).then(() => {
      message(`您删除了定时任务：${row.jobName}`, { type: "success" });
      getJobList();
    });
  }

  async function handleBulkDelete(tableRef: TableRef) {
    if (multipleSelection.value.length === 0) {
      message("请选择需要删除的数据", { type: "warning" });
      return;
    }

    await ElMessageBox.confirm(
      `确认删除编号为 [ ${multipleSelection.value} ] 的定时任务吗？`,
      "系统提示",
      { type: "warning", draggable: true }
    );
    await deleteJobApi(multipleSelection.value).then(() => {
      message(`您删除了编号为 [ ${multipleSelection.value} ] 的定时任务`, {
        type: "success"
      });
      tableRef.getTableRef().clearSelection();
      getJobList();
    });
  }

  async function handleRun(row: JobRow) {
    await runJobApi(row.jobId).then(() => {
      message(`定时任务 ${row.jobName} 已执行`, { type: "success" });
    });
  }

  function openLogDialog(row: JobRow) {
    addDialog({
      title: `运行日志 - ${row.jobName}`,
      props: {
        job: row
      },
      width: "78%",
      draggable: true,
      fullscreenIcon: true,
      closeOnClickModal: false,
      hideFooter: true,
      contentRenderer: () => h(jobLog, { job: row })
    });
  }

  async function handleStatusChange(row: JobRow, status: number) {
    await updateJobStatusApi(row.jobId, { status }).then(() => {
      message(`定时任务 ${row.jobName} 状态已更新`, { type: "success" });
      getJobList();
    });
  }

  onMounted(() => {
    getJobList();
  });

  return {
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
    openLogDialog,
    handleStatusChange
  };
}
