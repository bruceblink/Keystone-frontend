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
import type { DictItem, DictForm } from "./types";
import {
  addDictList,
  deleteDictList,
  getDictListQuery,
  updateDictList,
  type DictListItemDTO,
  type DictSaveDTO
} from "@/api/paramSettings/dict";
import { formatDateTime, genId, getValueType } from "./dict";
import {
  isExcelFile,
  logImportFailures,
  readExcelJsonRows,
  requireSelectionForExport,
  showImportResult
} from "../../importExport";

const normalizeDict = (item: DictListItemDTO): DictItem => ({
  _id: String(item._id ?? genId()),
  name: item.keyname ?? "",
  value: item.keyvalue ?? "",
  dataType: item.type ?? "",
  description: item.descripton ?? "",
  user: item.user ?? "",
  createdTime: item.create_time ?? ""
});

const toSavePayload = (
  form: DictForm,
  devid: string,
  options?: { _id?: string; create_time?: string }
): DictSaveDTO => ({
  _id: options?._id ?? form._id,
  keyname: form.keyname,
  keyvalue: form.keyvalue,
  type: form.type || getValueType(form.keyvalue),
  descripton: form.descripton,
  user: form.user || localStorage.getItem("username") || "",
  devid,
  create_time: options?.create_time ?? form.create_time ?? ""
});

export function useDictList(boatId: Ref<string>) {
  const tableData = ref<DictItem[]>([]);
  const loading = ref(false);

  const fetchDictList = async (devid?: string) => {
    const id = devid ?? boatId.value;
    if (!id) {
      tableData.value = [];
      return;
    }
    loading.value = true;
    try {
      const res = await getDictListQuery({ devid: id });
      const list = Array.isArray(res.data) ? res.data : [];
      tableData.value = list.map(normalizeDict);
      pagination.currentPage = 1;
    } catch (err) {
      console.error("[dict] 查询数据字典失败:", err);
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
          fetchDictList(id);
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
    if (boatId.value) fetchDictList(boatId.value);
  });
  onBeforeUnmount(() => {
    stopBoatWatch?.();
    stopBoatWatch = null;
  });
  onActivated(() => {
    startBoatWatch();
    if (boatId.value) fetchDictList(boatId.value);
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
          item.name?.toLowerCase().includes(q) ||
          item.value?.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q)
      );
    }
    return list.sort(
      (a, b) =>
        new Date(b.createdTime || 0).getTime() -
        new Date(a.createdTime || 0).getTime()
    );
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

  const multipleSelection = ref<DictItem[]>([]);

  const columns: TableColumnList = [
    { type: "selection", width: 50, reserveSelection: true },
    { label: "键名", prop: "name", minWidth: 160, showOverflowTooltip: true },
    { label: "键值", prop: "value", minWidth: 160, showOverflowTooltip: true },
    { label: "类型", prop: "dataType", width: 100 },
    {
      label: "描述",
      prop: "description",
      minWidth: 180,
      showOverflowTooltip: true
    },
    { label: "用户", prop: "user", width: 100 },
    { label: "创建时间", prop: "createdTime", width: 170 },
    { label: "操作", fixed: "right", width: 160, slot: "operation" }
  ];

  const addVisible = ref(false);
  const editVisible = ref(false);

  const addForm = reactive<DictForm>({
    keyname: "",
    keyvalue: "",
    type: "",
    descripton: "",
    user: ""
  });

  const editForm = reactive<DictForm>({
    _id: "",
    keyname: "",
    keyvalue: "",
    type: "",
    descripton: "",
    user: "",
    create_time: ""
  });

  const formRules: FormRules = {
    keyname: [{ required: true, message: "请输入键名", trigger: "blur" }],
    keyvalue: [{ required: true, message: "请输入键值", trigger: "blur" }],
    descripton: [{ required: true, message: "请输入描述", trigger: "blur" }]
  };

  const onKeyValueInput = (val: string, form: DictForm) => {
    form.type = getValueType(val);
  };

  const handleAdd = () => {
    if (!boatId.value) {
      ElMessage.warning("请先选择船只");
      return;
    }
    Object.assign(addForm, {
      keyname: "",
      keyvalue: "",
      type: "",
      descripton: "",
      user: localStorage.getItem("username") || ""
    });
    addVisible.value = true;
  };

  const submitAdd = async () => {
    if (!boatId.value) {
      ElMessage.warning("请先选择船只");
      return;
    }
    if (tableData.value.find(item => item.name === addForm.keyname)) {
      ElMessage.error("该键名已存在");
      return;
    }
    try {
      const res = await addDictList(
        toSavePayload(addForm, boatId.value, {
          _id: genId(),
          create_time: formatDateTime(new Date())
        })
      );
      ElMessage.success(res.msg || "新增成功");
      addVisible.value = false;
      await fetchDictList(boatId.value);
    } catch (err) {
      console.error("[dict] 新增数据字典失败:", err);
    }
  };

  const handleEdit = (row: DictItem) => {
    Object.assign(editForm, {
      _id: row._id,
      keyname: row.name,
      keyvalue: row.value,
      type: row.dataType,
      descripton: row.description,
      user: row.user,
      create_time: row.createdTime
    });
    editVisible.value = true;
  };

  const submitEdit = async () => {
    if (!boatId.value) {
      ElMessage.warning("请先选择船只");
      return;
    }
    try {
      const res = await updateDictList(
        toSavePayload(editForm, boatId.value, {
          _id: editForm._id,
          create_time: editForm.create_time
        })
      );
      ElMessage.success(res.msg || "编辑成功");
      editVisible.value = false;
      await fetchDictList(boatId.value);
    } catch (err) {
      console.error("[dict] 编辑数据字典失败:", err);
    }
  };

  const handleDelete = (row: DictItem) => {
    ElMessageBox.confirm(`确定要删除「${row.name}」吗？`, "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning"
    })
      .then(async () => {
        try {
          const res = await deleteDictList(row._id);
          ElMessage.success(res.msg || "删除成功");
          if (boatId.value) await fetchDictList(boatId.value);
        } catch (err) {
          console.error("[dict] 删除数据字典失败:", err);
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
      `确定要删除选中的 ${multipleSelection.value.length} 条记录吗？`,
      "提示",
      { confirmButtonText: "确定", cancelButtonText: "取消", type: "warning" }
    )
      .then(async () => {
        const rows = [...multipleSelection.value];
        let success = 0;
        let failed = 0;
        for (const row of rows) {
          try {
            await deleteDictList(row._id);
            success++;
          } catch {
            failed++;
          }
        }
        multipleSelection.value = [];
        if (boatId.value) await fetchDictList(boatId.value);
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
    await fetchDictList(boatId.value);
    ElMessage.success("已刷新");
  };

  const handleExport = () => {
    const rows = requireSelectionForExport(multipleSelection.value);
    if (!rows) return;
    const exportData = rows.map(item => ({
      键名: item.name,
      键值: item.value,
      类型: item.dataType,
      描述: item.description,
      用户: item.user,
      创建时间: item.createdTime
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    ws["!cols"] = [
      { wch: Math.max(10, ...exportData.map(r => String(r.键名).length)) },
      { wch: Math.max(15, ...exportData.map(r => String(r.键值).length)) },
      { wch: 10 },
      { wch: Math.max(20, ...exportData.map(r => String(r.描述).length)) },
      { wch: 10 },
      { wch: 20 }
    ];
    XLSX.utils.book_append_sheet(wb, ws, "数据字典");
    XLSX.writeFile(wb, "数据字典.xlsx");
    ElMessage.success("导出成功");
  };

  const importDictsFromFile = async (file: File) => {
    if (!isExcelFile(file)) {
      ElMessage.error("请选择 Excel 文件（.xlsx 或 .xls）");
      return;
    }

    await fetchDictList(boatId.value);
    const jsonData = await readExcelJsonRows(file);
    if (!jsonData.length) {
      ElMessage.warning("文件中没有可导入的数据");
      return;
    }

    const existingKeys = new Set(tableData.value.map(item => item.name));
    const seenInFile = new Set<string>();
    const toImport: DictSaveDTO[] = [];
    const skipLogs: { row: number; reason: string }[] = [];

    jsonData.forEach((row, index) => {
      const rowNum = index + 2;
      const keyname = String(row["键名"] || "").trim();
      const keyvalue = String(row["键值"] || "").trim();

      if (!keyname || !keyvalue) {
        skipLogs.push({ row: rowNum, reason: "缺少键名或键值" });
        return;
      }
      if (seenInFile.has(keyname)) {
        skipLogs.push({
          row: rowNum,
          reason: `键名「${keyname}」在文件内重复`
        });
        return;
      }
      if (existingKeys.has(keyname)) {
        skipLogs.push({ row: rowNum, reason: `键名「${keyname}」已存在` });
        return;
      }

      seenInFile.add(keyname);
      existingKeys.add(keyname);
      toImport.push({
        _id: genId(),
        keyname,
        keyvalue,
        type: getValueType(keyvalue),
        descripton: String(row["描述"] || ""),
        user: localStorage.getItem("username") || "",
        devid: boatId.value,
        create_time: formatDateTime(new Date())
      });
    });

    const skipped = skipLogs.length;
    if (!toImport.length) {
      logImportFailures("dict", skipLogs);
      ElMessage.warning("未导入任何数据，请检查文件内容");
      return;
    }

    loading.value = true;
    let added = 0;
    let apiFailed = 0;
    try {
      for (const payload of toImport) {
        try {
          await addDictList(payload);
          added++;
        } catch {
          apiFailed++;
        }
      }
      await fetchDictList(boatId.value);
      logImportFailures("dict", skipLogs);
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
      importDictsFromFile(file).catch(err => {
        console.error("[dict] 导入失败:", err);
        ElMessage.error("读取文件失败");
      });
    };
    input.click();
  };

  return {
    loading,
    searchQuery,
    filteredData,
    dataList,
    pagination,
    onSearch,
    multipleSelection,
    columns,
    addVisible,
    editVisible,
    addForm,
    editForm,
    formRules,
    onKeyValueInput,
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
