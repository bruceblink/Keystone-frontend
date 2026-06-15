import dayjs from "dayjs";
import typeForm from "../type-form.vue";
import dataForm from "../data-form.vue";
import { addDialog } from "@/components/ReDialog";
import { message } from "@/utils/message";
import { CommonUtils } from "@/utils/common";
import { type PaginationProps } from "@pureadmin/table";
import { ElMessageBox, type FormInstance } from "element-plus";
import { h, onMounted, reactive, ref, toRaw } from "vue";
import { useSystemDict } from "@/views/system/utils/dict";
import {
  addDictDataApi,
  addDictTypeApi,
  deleteDictDataApi,
  deleteDictTypeApi,
  getDictDataListApi,
  getDictTypeListApi,
  updateDictDataApi,
  updateDictTypeApi
} from "@/api/system/dict";
import type {
  DictDataDTO,
  DictDataQuery,
  DictDataRequest,
  DictTypeDTO,
  DictTypeQuery,
  DictTypeRequest
} from "@/api/system/dict";

type TableRef = {
  getTableRef: () => {
    clearSort: () => void;
  };
};

type DoneFn = Function;

type EditFormRef = {
  getFormRuleRef: () => {
    validate: (cb: (valid: boolean) => void) => void;
  };
};

type OpenDataDialogOptions = {
  lockDictType?: boolean;
};

const statusMap = useSystemDict("common.status").map;
const yesOrNoMap = useSystemDict("common.yesOrNo").map;

export function useDictHook() {
  const typePagination: PaginationProps = {
    total: 0,
    pageSize: 10,
    currentPage: 1,
    background: true
  };
  const dataPagination: PaginationProps = {
    total: 0,
    pageSize: 10,
    currentPage: 1,
    background: true
  };

  const typeSearchFormParams = reactive<DictTypeQuery>({
    dictName: undefined,
    dictType: undefined,
    status: undefined
  });
  const dataSearchFormParams = reactive<DictDataQuery>({
    dictType: undefined,
    dictLabel: undefined,
    status: undefined
  });

  const typeFormRef = ref<EditFormRef>();
  const dataFormRef = ref<EditFormRef>();
  const typeDataList = ref<DictTypeDTO[]>([]);
  const dictDataList = ref<DictDataDTO[]>([]);
  const selectedDictType = ref<DictTypeDTO>();
  const dataDialogVisible = ref(false);
  const typeLoading = ref(true);
  const dataLoading = ref(true);

  const typeColumns: TableColumnList = [
    { label: "字典编号", prop: "dictId", minWidth: 100 },
    { label: "字典名称", prop: "dictName", minWidth: 120 },
    { label: "字典类型", prop: "dictType", minWidth: 160 },
    {
      label: "状态",
      prop: "status",
      minWidth: 100,
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
      minWidth: 160,
      formatter: ({ createTime }) =>
        createTime ? dayjs(createTime).format("YYYY-MM-DD HH:mm:ss") : "-"
    },
    { label: "备注", prop: "remark", minWidth: 120 },
    { label: "操作", fixed: "right", width: 240, slot: "typeOperation" }
  ];

  const dataColumns: TableColumnList = [
    { label: "数据编号", prop: "dictCode", minWidth: 100 },
    { label: "字典类型", prop: "dictType", minWidth: 160 },
    { label: "数据标签", prop: "dictLabel", minWidth: 120 },
    { label: "数据键值", prop: "dictValue", minWidth: 120 },
    { label: "排序", prop: "dictSort", minWidth: 80 },
    {
      label: "默认值",
      prop: "isDefault",
      minWidth: 100,
      cellRenderer: ({ row, props }) => {
        const yesOrNo = yesOrNoMap.value[row.isDefault] ?? {
          cssTag: "info",
          label: String(row.isDefault ?? "-")
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
      minWidth: 100,
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
    { label: "标签样式", prop: "listClass", minWidth: 120 },
    { label: "操作", fixed: "right", width: 160, slot: "dataOperation" }
  ];

  function searchTypes() {
    typePagination.currentPage = 1;
    getTypeList();
  }

  function searchData() {
    dataPagination.currentPage = 1;
    getDataList();
  }

  function resetTypeForm(formEl: FormInstance | undefined, tableRef: TableRef) {
    if (!formEl) return;
    formEl.resetFields();
    tableRef.getTableRef().clearSort();
    searchTypes();
  }

  function resetDataForm(formEl: FormInstance | undefined, tableRef: TableRef) {
    if (!formEl) return;
    formEl.resetFields();
    tableRef.getTableRef().clearSort();
    searchData();
  }

  function clearDataSearch() {
    dataSearchFormParams.dictType = undefined;
    dataSearchFormParams.dictLabel = undefined;
    dataSearchFormParams.status = undefined;
    selectedDictType.value = undefined;
    searchData();
  }

  async function getTypeList() {
    CommonUtils.fillPaginationParams(typeSearchFormParams, typePagination);
    typeLoading.value = true;
    const { data } = await getDictTypeListApi(
      toRaw(typeSearchFormParams)
    ).finally(() => {
      typeLoading.value = false;
    });
    typeDataList.value = data.rows;
    typePagination.total = data.total;
  }

  async function getDataList() {
    CommonUtils.fillPaginationParams(dataSearchFormParams, dataPagination);
    dataLoading.value = true;
    const { data } = await getDictDataListApi(
      toRaw(dataSearchFormParams)
    ).finally(() => {
      dataLoading.value = false;
    });
    dictDataList.value = data.rows;
    dataPagination.total = data.total;
  }

  function selectDictType(row: DictTypeDTO) {
    dataSearchFormParams.dictType = row.dictType;
    searchData();
  }

  function openDictDataDrawer(row: DictTypeDTO) {
    selectedDictType.value = row;
    dataSearchFormParams.dictType = row.dictType;
    dataSearchFormParams.dictLabel = undefined;
    dataSearchFormParams.status = undefined;
    dataDialogVisible.value = true;
    searchData();
  }

  function openTypeDialog(title = "新增", row?: DictTypeDTO) {
    addDialog({
      title: `${title}字典类型`,
      props: {
        formInline: {
          dictName: row?.dictName ?? "",
          dictType: row?.dictType ?? "",
          status: row?.status ?? 1,
          remark: row?.remark ?? ""
        }
      },
      width: "40%",
      draggable: true,
      fullscreenIcon: true,
      closeOnClickModal: false,
      contentRenderer: () => h(typeForm, { ref: typeFormRef }),
      beforeSure: (done, { options }) => {
        const curData = options.props.formInline as DictTypeRequest;
        typeFormRef.value.getFormRuleRef().validate(valid => {
          if (!valid) return;
          if (title === "新增") {
            handleAddType(curData, done);
          } else {
            handleUpdateType(row.dictId, curData, done);
          }
        });
      }
    });
  }

  function openDataDialog(
    title = "新增",
    row?: DictDataDTO,
    options: OpenDataDialogOptions = {}
  ) {
    const dictTypeDisabled = options.lockDictType ?? Boolean(row);
    addDialog({
      title: `${title}字典数据`,
      props: {
        formInline: {
          dictType:
            row?.dictType ??
            selectedDictType.value?.dictType ??
            dataSearchFormParams.dictType ??
            "",
          dictLabel: row?.dictLabel ?? "",
          dictValue: row?.dictValue ?? "",
          dictSort: row?.dictSort ?? 1,
          isDefault: row?.isDefault ?? 0,
          cssClass: row?.cssClass ?? "",
          listClass: row?.listClass ?? "",
          status: row?.status ?? 1,
          remark: row?.remark ?? ""
        },
        dictTypeDisabled
      },
      width: "42%",
      draggable: true,
      fullscreenIcon: true,
      closeOnClickModal: false,
      contentRenderer: () => h(dataForm, { ref: dataFormRef }),
      beforeSure: (done, { options }) => {
        const curData = options.props.formInline as DictDataRequest;
        dataFormRef.value.getFormRuleRef().validate(valid => {
          if (!valid) return;
          if (title === "新增") {
            handleAddData(curData, done);
          } else {
            handleUpdateData(row.dictCode, curData, done);
          }
        });
      }
    });
  }

  async function handleAddType(data: DictTypeRequest, done: DoneFn) {
    await addDictTypeApi(data).then(() => {
      message(`您新增了字典类型：${data.dictName}`, { type: "success" });
      done();
      getTypeList();
    });
  }

  async function handleUpdateType(
    dictId: number,
    data: DictTypeRequest,
    done: DoneFn
  ) {
    await updateDictTypeApi(dictId, data).then(() => {
      message(`您更新了字典类型：${data.dictName}`, { type: "success" });
      done();
      getTypeList();
      getDataList();
    });
  }

  async function handleDeleteType(row: DictTypeDTO) {
    await ElMessageBox.confirm(
      `确认删除字典类型 ${row.dictName} 吗？`,
      "系统提示",
      { type: "warning", draggable: true }
    );
    await deleteDictTypeApi(row.dictId).then(() => {
      message(`您删除了字典类型：${row.dictName}`, { type: "success" });
      if (selectedDictType.value?.dictId === row.dictId) {
        dataDialogVisible.value = false;
        selectedDictType.value = undefined;
      }
      getTypeList();
    });
  }

  async function handleAddData(data: DictDataRequest, done: DoneFn) {
    await addDictDataApi(data).then(() => {
      message(`您新增了字典数据：${data.dictLabel}`, { type: "success" });
      done();
      getDataList();
    });
  }

  async function handleUpdateData(
    dictCode: number,
    data: DictDataRequest,
    done: DoneFn
  ) {
    await updateDictDataApi(dictCode, data).then(() => {
      message(`您更新了字典数据：${data.dictLabel}`, { type: "success" });
      done();
      getDataList();
    });
  }

  async function handleDeleteData(row: DictDataDTO) {
    await ElMessageBox.confirm(
      `确认删除字典数据 ${row.dictLabel} 吗？`,
      "系统提示",
      { type: "warning", draggable: true }
    );
    await deleteDictDataApi(row.dictCode).then(() => {
      message(`您删除了字典数据：${row.dictLabel}`, { type: "success" });
      getDataList();
    });
  }

  onMounted(() => {
    getTypeList();
    getDataList();
  });

  return {
    typeSearchFormParams,
    dataSearchFormParams,
    selectedDictType,
    dataDialogVisible,
    typePagination,
    dataPagination,
    typeColumns,
    dataColumns,
    typeDataList,
    dictDataList,
    typeLoading,
    dataLoading,
    getTypeList,
    getDataList,
    searchTypes,
    searchData,
    resetTypeForm,
    resetDataForm,
    clearDataSearch,
    selectDictType,
    openDictDataDrawer,
    openTypeDialog,
    openDataDialog,
    handleDeleteType,
    handleDeleteData
  };
}
