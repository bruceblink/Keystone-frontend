import dayjs from "dayjs";
import editForm from "../form.vue";
import { message } from "@/utils/message";
import {
  SystemNoticeQuery,
  getSystemNoticeListApi,
  SystemNoticeDTO
} from "@/api/system/notice";
import { addDialog } from "@/components/ReDialog";
import { ElMessageBox, Sort, type FormInstance } from "element-plus";
import { AddNoticeRequest } from "../utils/types";
import { type PaginationProps } from "@pureadmin/table";
import {
  addSystemNoticeApi,
  updateSystemNoticeApi,
  deleteSystemNoticeApi,
  SystemNoticeRequest
} from "@/api/system/notice";
import { reactive, ref, onMounted, h, toRaw } from "vue";
import { CommonUtils } from "@/utils/common";
import { useSystemDict } from "@/views/system/utils/dict";

const noticeTypeMap = useSystemDict("sysNotice.noticeType").map;
const noticeStatusMap = useSystemDict("sysNotice.status").map;

type NoticeRow = SystemNoticeDTO & {
  noticeId: number;
  noticeType: number;
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

export function useNoticeHook() {
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

  const searchFormParams = reactive<SystemNoticeQuery>({
    noticeTitle: undefined,
    noticeType: undefined,
    creatorName: undefined,
    orderColumn: defaultSort.prop,
    orderDirection: defaultSort.order
  });

  const formRef = ref<EditFormRef>();
  const dataList = ref<NoticeRow[]>([]);
  const pageLoading = ref(true);
  const multipleSelection = ref<number[]>([]);
  const currentSort = ref<Sort>({ ...defaultSort });

  const columns: TableColumnList = [
    {
      type: "selection",
      align: "left"
    },
    {
      label: "通知编号",
      prop: "noticeId",
      minWidth: 100
    },
    {
      label: "通知标题",
      prop: "noticeTitle",
      minWidth: 120
    },
    {
      label: "通知类型",
      prop: "noticeType",
      minWidth: 120,
      cellRenderer: ({ row, props }) => {
        const noticeType = noticeTypeMap.value[row.noticeType] ?? {
          cssTag: "info",
          label: String(row.noticeType ?? "-")
        };
        return (
          <el-tag size={props.size} type={noticeType.cssTag} effect="plain">
            {noticeType.label}
          </el-tag>
        );
      }
    },
    {
      label: "状态",
      prop: "status",
      minWidth: 120,
      cellRenderer: ({ row, props }) => {
        const status = noticeStatusMap.value[row.status] ?? {
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
      label: "通知详情",
      prop: "noticeContent",
      minWidth: 150
    },
    {
      label: "创建者",
      prop: "creatorName",
      minWidth: 120
    },
    {
      label: "创建时间",
      minWidth: 180,
      prop: "createTime",
      sortable: "custom",
      formatter: ({ createTime }) =>
        dayjs(createTime).format("YYYY-MM-DD HH:mm:ss")
    },
    {
      label: "操作",
      fixed: "right",
      width: 240,
      slot: "operation"
    }
  ];

  function onSearch() {
    // 点击搜索的时候 需要重置分页
    pagination.currentPage = 1;

    getNoticeList();
  }

  function resetForm(formEl: FormInstance | undefined, tableRef: TableRef) {
    if (!formEl) return;
    // 清空查询参数
    formEl.resetFields();
    currentSort.value = { ...defaultSort };
    tableRef.getTableRef().clearSort();
    // 重置分页并查询
    onSearch();
  }

  function handleSortChange(sort: Sort) {
    currentSort.value = sort.order ? sort : { ...defaultSort };
    pagination.currentPage = 1;
    getNoticeList();
  }

  async function getNoticeList() {
    CommonUtils.fillSortParams(searchFormParams, currentSort.value);
    CommonUtils.fillPaginationParams(searchFormParams, pagination);

    pageLoading.value = true;
    const { data } = await getSystemNoticeListApi(
      toRaw(searchFormParams)
    ).finally(() => {
      pageLoading.value = false;
    });

    dataList.value = data.rows as NoticeRow[];
    pagination.total = data.total;
  }

  async function handleDelete(row: NoticeRow) {
    await deleteSystemNoticeApi([row.noticeId]).then(() => {
      message(`您删除了通知标题为${row.noticeTitle}的这条数据`, {
        type: "success"
      });
      // 刷新列表
      getNoticeList();
    });
  }

  async function handleBulkDelete(tableRef: TableRef) {
    if (multipleSelection.value.length === 0) {
      message("请选择需要删除的数据", { type: "warning" });
      return;
    }

    ElMessageBox.confirm(
      `确认要<strong>删除</strong>编号为<strong style='color:var(--el-color-primary)'>[ ${multipleSelection.value} ]</strong>的通知吗?`,
      "系统提示",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
        dangerouslyUseHTMLString: true,
        draggable: true
      }
    )
      .then(async () => {
        await deleteSystemNoticeApi(multipleSelection.value).then(() => {
          message(`您删除了通知编号为[ ${multipleSelection.value} ]的数据`, {
            type: "success"
          });
          // 刷新列表
          getNoticeList();
        });
      })
      .catch(() => {
        message("取消删除", {
          type: "info"
        });
        // 清空checkbox选择的数据
        tableRef.getTableRef().clearSelection();
      });
  }

  async function handleAdd(row: SystemNoticeRequest, done: DoneFn) {
    await addSystemNoticeApi(row).then(() => {
      message(`您新增了通知标题为${row.noticeTitle}的这条数据`, {
        type: "success"
      });
      // 关闭弹框
      done();
      // 刷新列表
      getNoticeList();
    });
  }

  async function handleUpdate(row: SystemNoticeRequest, done: DoneFn) {
    await updateSystemNoticeApi(row).then(() => {
      message(`您更新了通知标题为${row.noticeTitle}的这条数据`, {
        type: "success"
      });
      // 关闭弹框
      done();
      // 刷新列表
      getNoticeList();
    });
  }

  function openDialog(title = "新增", row?: AddNoticeRequest) {
    addDialog({
      title: `${title}公告`,
      props: {
        formInline: {
          noticeTitle: row?.noticeTitle ?? "",
          noticeType: row?.noticeType ?? undefined,
          status: row?.status ?? undefined,
          noticeContent: row?.noticeContent ?? ""
        }
      },
      width: "40%",
      draggable: true,
      fullscreenIcon: true,
      closeOnClickModal: false,
      contentRenderer: () => h(editForm, { ref: formRef }),
      beforeSure: (done, { options }) => {
        const formRuleRef = formRef.value.getFormRuleRef();

        const curData = options.props.formInline as AddNoticeRequest;

        formRuleRef.validate(valid => {
          if (valid) {
            // 表单规则校验通过
            if (title === "新增") {
              handleAdd(curData as SystemNoticeRequest, done);
            } else {
              curData.noticeId = row.noticeId;
              handleUpdate(curData as SystemNoticeRequest, done);
            }
          }
        });
      }
    });
  }

  onMounted(() => {
    getNoticeList();
  });

  return {
    searchFormParams,
    pageLoading,
    columns,
    dataList,
    pagination,
    defaultSort,
    multipleSelection,
    getNoticeList,
    handleSortChange,
    onSearch,
    resetForm,
    openDialog,
    handleDelete,
    handleBulkDelete
  };
}
