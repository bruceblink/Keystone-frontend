import {
  ref,
  computed,
  reactive,
  watch,
  onMounted,
  onBeforeUnmount,
  onActivated,
  onDeactivated,
  type Ref
} from "vue";
import { ElMessage, ElMessageBox, type FormRules } from "element-plus";
import * as XLSX from "xlsx";
import type { AlarmTypeItem, AlarmTypeForm } from "./types";
import {
  addReasonTypeList,
  deleteReasonTypeList,
  getReasonTypeListQuery,
  updateReasonTypeList,
  type ReasonTypeListItemDTO,
  type ReasonTypeSaveDTO
} from "@/api/paramSettings/alarmType";
import { formatDateTime, genId, TYPE_MAP } from "./dict";
import {
  isExcelFile,
  logImportFailures,
  readExcelJsonRows,
  requireSelectionForExport,
  showImportResult
} from "../../importExport";

const toFlag = (v: string | number | undefined) =>
  String(v) === "1" || v === 1 ? "1" : "0";

const normalizeReasonType = (item: ReasonTypeListItemDTO): AlarmTypeItem => ({
  _id: String(item._id ?? genId()),
  id: String(item.id ?? ""),
  des: item.des ?? "",
  type: String(item.type ?? "1"),
  alarmid: item.alarmid ?? "",
  s2cloud: toFlag(item.s2cloud),
  s2ship: toFlag(item.s2ship),
  visibility: toFlag(item.visibility),
  create_time: item.create_time ?? "",
  user: item.user ?? ""
});

const toSavePayload = (
  form: AlarmTypeForm,
  devid: string,
  options?: { _id?: string; create_time?: string }
): ReasonTypeSaveDTO => ({
  _id: options?._id ?? form._id,
  id: form.id,
  alarmid: form.alarmid,
  des: form.des,
  type: form.type || "1",
  s2cloud: form.s2cloud,
  s2ship: form.s2ship,
  visibility: form.visibility,
  devid,
  create_time: options?.create_time ?? ""
});

export function useAlarmTypeList(boatId: Ref<string>) {
  const tableData = ref<AlarmTypeItem[]>([]);
  const loading = ref(false);

  const fetchReasonTypeList = async (devid?: string) => {
    const id = devid ?? boatId.value;
    if (!id) {
      tableData.value = [];
      return;
    }
    loading.value = true;
    try {
      const res = await getReasonTypeListQuery({ devid: id });
      const list = Array.isArray(res.data) ? res.data : [];
      tableData.value = list.map(normalizeReasonType);
      pagination.currentPage = 1;
    } catch (err) {
      console.error("[alarmType] 查询报警类型失败:", err);
      tableData.value = [];
    } finally {
      loading.value = false;
    }
  };

  let stopBoatWatch: (() => void) | null = null;

  function startBoatWatch() {
    stopBoatWatch?.();
    stopBoatWatch = watch(
      boatId,
      id => {
        if (id) {
          fetchReasonTypeList(id);
        } else {
          tableData.value = [];
          pagination.currentPage = 1;
        }
      },
      { immediate: false }
    );
  }

  onMounted(() => {
    startBoatWatch();
    if (boatId.value) fetchReasonTypeList(boatId.value);
  });
  onBeforeUnmount(() => {
    stopBoatWatch?.();
    stopBoatWatch = null;
  });
  onActivated(() => {
    startBoatWatch();
    if (boatId.value) fetchReasonTypeList(boatId.value);
  });
  onDeactivated(() => {
    stopBoatWatch?.();
    stopBoatWatch = null;
  });

  const searchQuery = ref("");

  const filteredData = computed(() => {
    let list = [...tableData.value];
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase();
      list = list.filter(
        item =>
          String(item.id).toLowerCase().includes(q) ||
          String(item.des).toLowerCase().includes(q) ||
          (TYPE_MAP[item.type] || "").toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => Number(a.id) - Number(b.id));
  });

  const onSearch = () => {
    pagination.currentPage = 1;
  };

  const pagination = reactive({
    currentPage: 1,
    pageSize: 30,
    total: 0,
    background: true
  });

  const dataList = computed(() => {
    pagination.total = filteredData.value.length;
    const start = (pagination.currentPage - 1) * pagination.pageSize;
    return filteredData.value.slice(start, start + pagination.pageSize);
  });

  const multipleSelection = ref<AlarmTypeItem[]>([]);

  const columns: TableColumnList = [
    { type: "selection", width: 55, reserveSelection: true },
    { label: "报警编号", prop: "id", width: 120 },
    {
      label: "报警类型名称",
      prop: "des",
      minWidth: 160,
      showOverflowTooltip: true
    },
    { label: "类型", prop: "type", width: 100, slot: "type" },
    { label: "分组编号", prop: "alarmid", width: 120 },
    { label: "云端同步", prop: "s2cloud", width: 110, slot: "s2cloud" },
    { label: "船端同步", prop: "s2ship", width: 110, slot: "s2ship" },
    { label: "可见状态", prop: "visibility", width: 110, slot: "visibility" },
    { label: "操作", fixed: "right", width: 160, slot: "operation" }
  ];

  const addVisible = ref(false);
  const editVisible = ref(false);

  const addForm = reactive<AlarmTypeForm>({
    id: "",
    des: "",
    type: "",
    alarmid: "",
    s2cloud: "0",
    s2ship: "0",
    visibility: "0"
  });

  const editForm = reactive<AlarmTypeForm>({
    _id: "",
    id: "",
    des: "",
    type: "1",
    alarmid: "",
    s2cloud: "0",
    s2ship: "0",
    visibility: "0",
    originalDes: ""
  });

  const addRules: FormRules = {
    id: [
      { required: true, message: "请输入报警编号", trigger: "blur" },
      {
        validator: (_rule, value, callback) => {
          if (!/^\d+$/.test(value)) {
            callback(new Error("报警编号必须为整数"));
            return;
          }
          if (tableData.value.some(item => item.id === value)) {
            callback(new Error("该报警编号已存在"));
            return;
          }
          callback();
        },
        trigger: "blur"
      }
    ],
    des: [
      { required: true, message: "请输入报警类型名称", trigger: "blur" },
      {
        validator: (_rule, value, callback) => {
          if (!/^[\u4e00-\u9fa5a-zA-Z]+$/.test(value)) {
            callback(new Error("报警类型名称只能包含中文和英文"));
            return;
          }
          if (tableData.value.some(item => item.des === value)) {
            callback(new Error("该报警类型名称已存在"));
            return;
          }
          callback();
        },
        trigger: "blur"
      }
    ],
    type: [{ required: true, message: "请选择类型", trigger: "change" }],
    alarmid: [{ required: true, message: "请输入分组编号", trigger: "blur" }]
  };

  const editRules: FormRules = {
    id: [{ required: true, message: "请输入报警编号", trigger: "blur" }],
    des: [
      { required: true, message: "请输入报警类型名称", trigger: "blur" },
      {
        validator: (_rule, value, callback) => {
          if (!/^[\u4e00-\u9fa5a-zA-Z]+$/.test(value)) {
            callback(new Error("报警类型名称只能包含中文和英文"));
            return;
          }
          if (value === editForm.originalDes) {
            callback();
            return;
          }
          if (tableData.value.some(item => item.des === value)) {
            callback(new Error("该报警类型名称已存在"));
            return;
          }
          callback();
        },
        trigger: "blur"
      }
    ],
    type: [{ required: true, message: "请选择类型", trigger: "change" }],
    alarmid: [{ required: true, message: "请输入分组编号", trigger: "blur" }]
  };

  const handleSwitchChange = async (row: AlarmTypeItem) => {
    if (!boatId.value) return;
    try {
      await updateReasonTypeList(
        toSavePayload(
          {
            _id: row._id,
            id: row.id,
            des: row.des,
            type: row.type,
            alarmid: row.alarmid,
            s2cloud: row.s2cloud,
            s2ship: row.s2ship,
            visibility: row.visibility
          },
          boatId.value,
          { _id: row._id, create_time: row.create_time }
        )
      );
      ElMessage.success("切换成功");
    } catch (err) {
      console.error("[alarmType] 更新开关状态失败:", err);
      await fetchReasonTypeList(boatId.value);
    }
  };

  const handleAdd = () => {
    if (!boatId.value) {
      ElMessage.warning("请先选择船只");
      return;
    }
    Object.assign(addForm, {
      id: "",
      des: "",
      type: "",
      alarmid: "",
      s2cloud: "0",
      s2ship: "0",
      visibility: "0"
    });
    addVisible.value = true;
  };

  const submitAdd = async () => {
    if (!boatId.value) {
      ElMessage.warning("请先选择船只");
      return;
    }
    if (tableData.value.some(item => item.id === addForm.id)) {
      ElMessage.error("该报警编号已存在");
      return;
    }
    try {
      const res = await addReasonTypeList(
        toSavePayload(addForm, boatId.value, {
          _id: genId(),
          create_time: formatDateTime(new Date())
        })
      );
      ElMessage.success(res.msg || "新增成功");
      addVisible.value = false;
      await fetchReasonTypeList(boatId.value);
    } catch (err) {
      console.error("[alarmType] 新增报警类型失败:", err);
    }
  };

  const handleEdit = (row: AlarmTypeItem) => {
    Object.assign(editForm, {
      _id: row._id,
      id: row.id,
      des: row.des,
      type: row.type,
      alarmid: row.alarmid,
      s2cloud: row.s2cloud,
      s2ship: row.s2ship,
      visibility: row.visibility,
      originalDes: row.des
    });
    editVisible.value = true;
  };

  const submitEdit = async () => {
    if (!boatId.value) {
      ElMessage.warning("请先选择船只");
      return;
    }
    const origin = tableData.value.find(item => item._id === editForm._id);
    try {
      const res = await updateReasonTypeList(
        toSavePayload(editForm, boatId.value, {
          _id: editForm._id,
          create_time: origin?.create_time ?? ""
        })
      );
      ElMessage.success(res.msg || "编辑成功");
      editVisible.value = false;
      await fetchReasonTypeList(boatId.value);
    } catch (err) {
      console.error("[alarmType] 编辑报警类型失败:", err);
    }
  };

  const handleDelete = (row: AlarmTypeItem) => {
    ElMessageBox.confirm(
      `确定要删除报警编号为「${row.id}」的报警类型吗？`,
      "提示",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning"
      }
    )
      .then(async () => {
        try {
          const res = await deleteReasonTypeList(row._id);
          ElMessage.success(res.msg || "删除成功");
          if (boatId.value) await fetchReasonTypeList(boatId.value);
        } catch (err) {
          console.error("[alarmType] 删除报警类型失败:", err);
        }
      })
      .catch(() => {});
  };

  const handleBatchDelete = () => {
    if (!multipleSelection.value.length) {
      ElMessage.warning("请先选择要删除的数据");
      return;
    }
    ElMessageBox.confirm(
      `确定要删除选中的 ${multipleSelection.value.length} 条数据吗？`,
      "提示",
      { confirmButtonText: "确定", cancelButtonText: "取消", type: "warning" }
    )
      .then(async () => {
        const rows = [...multipleSelection.value];
        let success = 0;
        let failed = 0;
        for (const row of rows) {
          try {
            await deleteReasonTypeList(row._id);
            success++;
          } catch {
            failed++;
          }
        }
        multipleSelection.value = [];
        if (boatId.value) await fetchReasonTypeList(boatId.value);
        if (success > 0) {
          ElMessage.success(
            `批量删除成功 ${success} 条${failed ? `，失败 ${failed} 条` : ""}`
          );
        } else {
          ElMessage.error("批量删除失败");
        }
      })
      .catch(() => {});
  };

  const handleRefresh = async () => {
    if (!boatId.value) {
      ElMessage.warning("请先选择船只");
      return;
    }
    searchQuery.value = "";
    await fetchReasonTypeList(boatId.value);
    ElMessage.success("已刷新");
  };

  const handleExport = () => {
    const rows = requireSelectionForExport(multipleSelection.value);
    if (!rows) return;
    const exportData = rows.map(item => ({
      报警编号: item.id,
      报警类型名称: item.des,
      类型: TYPE_MAP[item.type] || item.type,
      分组编号: item.alarmid,
      云端同步: item.s2cloud === "1" ? "是" : "否",
      船端同步: item.s2ship === "1" ? "是" : "否",
      可见状态: item.visibility === "1" ? "是" : "否"
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    ws["!cols"] = [
      { wch: Math.max(10, ...exportData.map(r => String(r.报警编号).length)) },
      {
        wch: Math.max(15, ...exportData.map(r => String(r.报警类型名称).length))
      },
      { wch: 8 },
      { wch: 10 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 }
    ];
    XLSX.utils.book_append_sheet(wb, ws, "报警类型数据");
    XLSX.writeFile(wb, "报警类型数据.xlsx");
    ElMessage.success("导出成功");
  };

  const importReasonTypesFromFile = async (file: File) => {
    if (!isExcelFile(file)) {
      ElMessage.error("请选择 Excel 文件（.xlsx 或 .xls）");
      return;
    }

    await fetchReasonTypeList(boatId.value);
    const jsonData = await readExcelJsonRows(file);
    if (!jsonData.length) {
      ElMessage.warning("文件中没有可导入的数据");
      return;
    }

    const existingIds = new Set(tableData.value.map(item => item.id));
    const existingDes = new Set(tableData.value.map(item => item.des));
    const seenIds = new Set<string>();
    const seenDes = new Set<string>();
    const toImport: ReasonTypeSaveDTO[] = [];
    const skipLogs: { row: number; reason: string }[] = [];

    jsonData.forEach((row, index) => {
      const rowNum = index + 2;
      const id = String(row["报警编号"] || "").trim();
      const des = String(row["报警类型名称"] || "").trim();
      const typeLabel = String(row["类型"] || "").trim();
      const alarmid = String(row["分组编号"] || "").trim();

      if (!id || !des || !alarmid) {
        skipLogs.push({ row: rowNum, reason: "缺少报警编号、名称或分组编号" });
        return;
      }
      if (!/^\d+$/.test(id)) {
        skipLogs.push({ row: rowNum, reason: "报警编号须为数字" });
        return;
      }
      if (!/^[\u4e00-\u9fa5a-zA-Z]+$/.test(des)) {
        skipLogs.push({ row: rowNum, reason: "报警类型名称格式无效" });
        return;
      }
      if (seenIds.has(id)) {
        skipLogs.push({ row: rowNum, reason: `报警编号「${id}」在文件内重复` });
        return;
      }
      if (seenDes.has(des)) {
        skipLogs.push({ row: rowNum, reason: `名称「${des}」在文件内重复` });
        return;
      }
      if (existingIds.has(id)) {
        skipLogs.push({ row: rowNum, reason: `报警编号「${id}」已存在` });
        return;
      }
      if (existingDes.has(des)) {
        skipLogs.push({ row: rowNum, reason: `名称「${des}」已存在` });
        return;
      }

      seenIds.add(id);
      seenDes.add(des);
      existingIds.add(id);
      existingDes.add(des);

      const type =
        typeLabel === "记录" ? "0" : typeLabel === "报警" ? "1" : "1";
      const flag = (v: string) => (v === "是" || v === "1" ? "1" : "0");

      toImport.push({
        _id: genId(),
        id,
        des,
        type,
        alarmid,
        s2cloud: flag(String(row["云端同步"] || "")),
        s2ship: flag(String(row["船端同步"] || "")),
        visibility: flag(String(row["可见状态"] || "")),
        devid: boatId.value,
        create_time: formatDateTime(new Date())
      });
    });

    const skipped = skipLogs.length;
    if (!toImport.length) {
      logImportFailures("alarmType", skipLogs);
      ElMessage.warning("未导入任何数据，请检查文件内容");
      return;
    }

    loading.value = true;
    let added = 0;
    let apiFailed = 0;
    try {
      for (const payload of toImport) {
        try {
          await addReasonTypeList(payload);
          added++;
        } catch {
          apiFailed++;
        }
      }
      await fetchReasonTypeList(boatId.value);
      logImportFailures("alarmType", skipLogs);
      showImportResult(added, skipped, apiFailed);
    } finally {
      loading.value = false;
    }
  };

  const handleImport = () => {
    if (!boatId.value) {
      ElMessage.warning("请先选择船只");
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx,.xls";
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      importReasonTypesFromFile(file).catch(err => {
        console.error("[alarmType] 导入失败:", err);
        ElMessage.error("读取文件失败");
      });
    };
    input.click();
  };

  return {
    loading,
    searchQuery,
    dataList,
    filteredData,
    pagination,
    onSearch,
    multipleSelection,
    columns,
    addVisible,
    editVisible,
    addForm,
    editForm,
    addRules,
    editRules,
    handleSwitchChange,
    handleAdd,
    submitAdd,
    handleEdit,
    submitEdit,
    handleDelete,
    handleBatchDelete,
    handleRefresh,
    handleExport,
    handleImport
  };
}
