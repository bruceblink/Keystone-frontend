import editForm from "../form.vue";
import { message } from "@/utils/message";
import { addDialog } from "@/components/ReDialog";
import { type PaginationProps } from "@pureadmin/table";
import { type FormInstance } from "element-plus";

import {
  getConfigListApi,
  getConfigInfoApi,
  updateConfigApi,
  refreshConfigCacheApi,
  ConfigQuery,
  ConfigDTO,
  UpdateConfigRequest
} from "@/api/system/config";
import { reactive, ref, onMounted, h, toRaw } from "vue";
import { CommonUtils } from "@/utils/common";

type TableRef = {
  getTableRef: () => {
    clearSort: () => void;
  };
};

type DoneFn = Function;

type ConfigFormData = ConfigDTO & {
  configId: string;
  configName: string;
  configValue: string;
};

type EditFormRef = {
  getFormRuleRef: () => {
    validate: (cb: (valid: boolean) => void) => void;
  };
};

export function useHook() {
  const pagination: PaginationProps = {
    total: 0,
    pageSize: 10,
    currentPage: 1,
    background: true
  };

  const searchFormParams = reactive<ConfigQuery>({
    configKey: undefined,
    configName: undefined,
    isAllowChange: undefined
  });

  const formRef = ref<EditFormRef>();
  const dataList = ref<ConfigDTO[]>([]);
  const pageLoading = ref(true);
  const multipleSelection = ref<string[]>([]);

  const columns: TableColumnList = [
    {
      label: "参数编号",
      prop: "configId",
      minWidth: 60
    },
    {
      label: "参数名称",
      prop: "configName",
      minWidth: 120
    },
    {
      label: "参数键",
      prop: "configKey",
      minWidth: 120,
      showOverflowTooltip: true
    },
    {
      label: "参数值",
      prop: "configValue",
      minWidth: 150
    },
    {
      label: "参数选项",
      prop: "configOptions",
      minWidth: 120
    },
    {
      label: "允许更改",
      prop: "isAllowChangeStr",
      minWidth: 100
    },
    {
      label: "备注",
      prop: "remark",
      minWidth: 120,
      showOverflowTooltip: true
    },
    {
      label: "操作",
      fixed: "right",
      width: 120,
      slot: "operation"
    }
  ];

  function onSearch() {
    // 点击搜索的时候 需要重置分页
    pagination.currentPage = 1;

    getList();
  }

  function resetForm(formEl: FormInstance | undefined, tableRef: TableRef) {
    if (!formEl) return;
    // 清空查询参数
    formEl.resetFields();

    tableRef.getTableRef().clearSort();
    // 重置分页并查询
    onSearch();
  }

  async function getList() {
    CommonUtils.fillPaginationParams(searchFormParams, pagination);

    pageLoading.value = true;
    const { data } = await getConfigListApi(toRaw(searchFormParams)).finally(
      () => {
        pageLoading.value = false;
      }
    );

    dataList.value = data.rows;
    pagination.total = data.total;
  }

  async function handleRefresh() {
    await refreshConfigCacheApi().then(() => {
      message("刷新缓存成功", {
        type: "success"
      });
      // 刷新列表
      getList();
    });
  }

  async function handleUpdate(curData: ConfigFormData, done: DoneFn) {
    const request: UpdateConfigRequest = {
      configValue: curData.configValue
    };

    await updateConfigApi(Number(curData.configId), request).then(() => {
      message(`您成功修改了配置：${curData.configName}`, {
        type: "success"
      });
      // 关闭弹框
      done();
      // 刷新列表
      getList();
    });
  }

  async function openDialog(row?: ConfigDTO) {
    const { data } = await getConfigInfoApi(row.configId);
    addDialog({
      title: `修改配置`,
      props: {
        formInline: data
      },
      width: "40%",
      draggable: true,
      fullscreenIcon: true,
      closeOnClickModal: false,
      contentRenderer: () => h(editForm, { ref: formRef }),
      beforeSure: (done, { options }) => {
        const formRuleRef = formRef.value.getFormRuleRef();

        const curData = options.props.formInline as ConfigFormData;

        formRuleRef.validate(valid => {
          if (valid) {
            handleUpdate(curData, done);
          }
        });
      }
    });
  }

  onMounted(() => {
    getList();
  });

  return {
    searchFormParams,
    pageLoading,
    columns,
    dataList,
    pagination,
    multipleSelection,
    getList,
    onSearch,
    resetForm,
    handleRefresh,
    openDialog
  };
}
