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
import type { DictItem, DictForm, DictTypeForm, DictTypeItem } from "./types";
import {
  addDictList,
  addDeviceDictionaryType,
  deleteDictList,
  deleteDeviceDictionaryType,
  getDeviceDictionaryTypes,
  getConfigModuleOptions,
  getDictListQuery,
  updateDeviceDictionaryType,
  updateDictList,
  type ConfigModuleOption,
  type DictListItemDTO,
  type DeviceDictionaryTypeDTO,
  type DeviceDictionaryTypeSaveDTO,
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

const fallbackModuleOptions: ConfigModuleOption[] = [
  { label: "通用", value: "common" }
];

const dictKey = (keyname: string, groupKey?: string) =>
  `${groupKey ?? ""}\u0000${keyname}`;

const normalizeDict = (
  item: DictListItemDTO,
  moduleLabel: (groupKey?: string) => string
): DictItem => ({
  _id: String(item._id ?? genId()),
  name: item.keyname ?? "",
  value: item.keyvalue ?? "",
  groupKey: item.groupKey ?? "",
  groupName: moduleLabel(item.groupKey),
  dataType: item.type ?? "",
  description: item.descripton ?? "",
  user: item.user ?? "",
  createdTime: item.create_time ?? ""
});

const normalizeDictType = (item: DeviceDictionaryTypeDTO): DictTypeItem => ({
  dictType: item.dictType ?? "",
  dictName: item.dictName ?? "",
  category: item.category ?? "",
  scope: item.scope ?? "",
  status: item.status ?? 1,
  sort: item.sort ?? 0,
  remark: item.remark ?? "",
  aliases: Array.isArray(item.aliases) ? item.aliases : []
});

const toSavePayload = (
  form: DictForm,
  devid: string,
  options?: { _id?: string; create_time?: string }
): DictSaveDTO => ({
  _id: options?._id ?? form._id,
  keyname: form.keyname,
  keyvalue: form.keyvalue,
  groupKey: form.groupKey ?? "",
  type: form.type || getValueType(form.keyvalue),
  descripton: form.descripton,
  user: form.user || localStorage.getItem("username") || "",
  devid,
  create_time: options?.create_time ?? form.create_time ?? ""
});

const toTypeSavePayload = (
  form: DictTypeForm
): DeviceDictionaryTypeSaveDTO => ({
  dictType: form.dictType,
  dictName: form.dictName,
  category: form.category || "dictionary",
  scope: form.scope || "device",
  status: form.status ?? 1,
  sort: form.sort ?? 0,
  remark: form.remark,
  aliases: form.aliases ?? []
});

export function useDictList(boatId: Ref<string>) {
  const tableData = ref<DictItem[]>([]);
  const loading = ref(false);
  const searchQuery = ref("");
  const groupFilter = ref("");
  const moduleOptions = ref<ConfigModuleOption[]>([...fallbackModuleOptions]);
  const activeTab = ref<"items" | "types">("items");

  const moduleLabel = (groupKey?: string) => {
    if (!groupKey) return "";
    return (
      moduleOptions.value.find(item => item.value === groupKey)?.label ??
      groupKey
    );
  };

  const moduleKey = (value?: string) => {
    const key = String(value ?? "").trim();
    return moduleOptions.value.find(item => item.label === key)?.value ?? key;
  };

  const fetchModuleOptions = async () => {
    try {
      const res = await getConfigModuleOptions();
      const options = Array.isArray(res.data) ? res.data : [];
      moduleOptions.value = options.length
        ? options
        : [...fallbackModuleOptions];
    } catch (err) {
      console.error("[dict] 查询配置模块字典失败:", err);
      moduleOptions.value = [...fallbackModuleOptions];
    }
  };

  const fetchDictList = async (devid?: string) => {
    const id = devid ?? boatId.value;
    if (!id) {
      tableData.value = [];
      return;
    }
    loading.value = true;
    try {
      const res = await getDictListQuery({
        devid: id,
        groupKey: groupFilter.value || undefined
      });
      const list = Array.isArray(res.data) ? res.data : [];
      tableData.value = list.map(item => normalizeDict(item, moduleLabel));
      pagination.currentPage = 1;
    } catch (err) {
      console.error("[dict] 查询数据字典失败:", err);
      tableData.value = [];
    } finally {
      loading.value = false;
    }
  };

  const typeTableData = ref<DictTypeItem[]>([]);
  const typeLoading = ref(false);
  const typeSearchQuery = ref("");

  const fetchTypeList = async () => {
    typeLoading.value = true;
    try {
      const res = await getDeviceDictionaryTypes();
      const list = Array.isArray(res.data) ? res.data : [];
      typeTableData.value = list.map(normalizeDictType);
      typePagination.currentPage = 1;
    } catch (err) {
      console.error("[dict] 查询字典类型失败:", err);
      typeTableData.value = [];
    } finally {
      typeLoading.value = false;
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

  onMounted(async () => {
    startBoatWatch();
    await fetchModuleOptions();
    await fetchTypeList();
    if (boatId.value) fetchDictList(boatId.value);
  });
  onBeforeUnmount(() => {
    stopBoatWatch?.();
    stopBoatWatch = null;
  });
  onActivated(async () => {
    startBoatWatch();
    await fetchModuleOptions();
    await fetchTypeList();
    if (boatId.value) fetchDictList(boatId.value);
  });
  onDeactivated(() => {
    stopBoatWatch?.();
    stopBoatWatch = null;
  });

  const filteredData = computed(() => {
    let list = [...tableData.value];
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase();
      list = list.filter(
        item =>
          item.name?.toLowerCase().includes(q) ||
          item.value?.toLowerCase().includes(q) ||
          item.groupName?.toLowerCase().includes(q) ||
          item.groupKey?.toLowerCase().includes(q) ||
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

  const onGroupFilterChange = async () => {
    pagination.currentPage = 1;
    if (boatId.value) await fetchDictList(boatId.value);
  };

  const pagination = reactive({
    currentPage: 1,
    pageSize: 30,
    total: 0,
    background: true
  });

  const typeFilteredData = computed(() => {
    let list = [...typeTableData.value];
    if (typeSearchQuery.value) {
      const q = typeSearchQuery.value.toLowerCase();
      list = list.filter(
        item =>
          item.dictType.toLowerCase().includes(q) ||
          item.dictName.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.scope.toLowerCase().includes(q) ||
          item.remark.toLowerCase().includes(q) ||
          item.aliases.some(alias => alias.toLowerCase().includes(q))
      );
    }
    return list.sort(
      (a, b) => a.sort - b.sort || a.dictType.localeCompare(b.dictType)
    );
  });

  const typePagination = reactive({
    currentPage: 1,
    pageSize: 30,
    total: 0,
    background: true
  });

  const typeDataList = computed(() => {
    typePagination.total = typeFilteredData.value.length;
    const start = (typePagination.currentPage - 1) * typePagination.pageSize;
    return typeFilteredData.value.slice(start, start + typePagination.pageSize);
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
    { label: "模块", prop: "groupName", width: 120, showOverflowTooltip: true },
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

  const typeColumns: TableColumnList = [
    {
      label: "类型标识",
      prop: "dictType",
      minWidth: 190,
      showOverflowTooltip: true
    },
    {
      label: "类型名称",
      prop: "dictName",
      minWidth: 140,
      showOverflowTooltip: true
    },
    { label: "分类", prop: "category", width: 110 },
    { label: "作用域", prop: "scope", width: 100 },
    { label: "状态", prop: "status", width: 90, slot: "status" },
    { label: "排序", prop: "sort", width: 90 },
    { label: "兼容别名", prop: "aliases", minWidth: 180, slot: "aliases" },
    { label: "备注", prop: "remark", minWidth: 180, showOverflowTooltip: true },
    { label: "操作", fixed: "right", width: 160, slot: "operation" }
  ];

  const addVisible = ref(false);
  const editVisible = ref(false);
  const typeAddVisible = ref(false);
  const typeEditVisible = ref(false);

  const addForm = reactive<DictForm>({
    keyname: "",
    keyvalue: "",
    groupKey: "common",
    type: "",
    descripton: "",
    user: ""
  });

  const editForm = reactive<DictForm>({
    _id: "",
    keyname: "",
    keyvalue: "",
    groupKey: "",
    type: "",
    descripton: "",
    user: "",
    create_time: ""
  });

  const typeAddForm = reactive<DictTypeForm>({
    dictType: "",
    dictName: "",
    category: "dictionary",
    scope: "device",
    status: 1,
    sort: 0,
    remark: "",
    aliases: []
  });

  const typeEditForm = reactive<DictTypeForm>({
    dictType: "",
    dictName: "",
    category: "dictionary",
    scope: "device",
    status: 1,
    sort: 0,
    remark: "",
    aliases: []
  });

  const formRules: FormRules = {
    keyname: [{ required: true, message: "请输入键名", trigger: "blur" }],
    keyvalue: [{ required: true, message: "请输入键值", trigger: "blur" }],
    descripton: [{ required: true, message: "请输入描述", trigger: "blur" }]
  };

  const typeFormRules: FormRules = {
    dictType: [{ required: true, message: "请输入类型标识", trigger: "blur" }],
    dictName: [{ required: true, message: "请输入类型名称", trigger: "blur" }],
    category: [{ required: true, message: "请选择分类", trigger: "change" }],
    scope: [{ required: true, message: "请选择作用域", trigger: "change" }]
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
      groupKey: groupFilter.value || "common",
      type: "",
      descripton: "",
      user: localStorage.getItem("username") || ""
    });
    addVisible.value = true;
  };

  const handleTypeAdd = () => {
    Object.assign(typeAddForm, {
      dictType: "",
      dictName: "",
      category: "dictionary",
      scope: "device",
      status: 1,
      sort: 0,
      remark: "",
      aliases: []
    });
    typeAddVisible.value = true;
  };

  const submitAdd = async () => {
    if (!boatId.value) {
      ElMessage.warning("请先选择船只");
      return;
    }
    if (
      tableData.value.find(
        item =>
          dictKey(item.name, item.groupKey) ===
          dictKey(addForm.keyname, addForm.groupKey)
      )
    ) {
      ElMessage.error("该模块下键名已存在");
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

  const submitTypeAdd = async () => {
    if (
      typeTableData.value.some(item => item.dictType === typeAddForm.dictType)
    ) {
      ElMessage.error("该类型标识已存在");
      return;
    }
    try {
      const res = await addDeviceDictionaryType(toTypeSavePayload(typeAddForm));
      ElMessage.success(res.msg || "新增成功");
      typeAddVisible.value = false;
      await fetchTypeList();
      await fetchModuleOptions();
    } catch (err) {
      console.error("[dict] 新增字典类型失败:", err);
    }
  };

  const handleEdit = (row: DictItem) => {
    Object.assign(editForm, {
      _id: row._id,
      keyname: row.name,
      keyvalue: row.value,
      groupKey: row.groupKey,
      type: row.dataType,
      descripton: row.description,
      user: row.user,
      create_time: row.createdTime
    });
    editVisible.value = true;
  };

  const handleTypeEdit = (row: DictTypeItem) => {
    Object.assign(typeEditForm, {
      dictType: row.dictType,
      dictName: row.dictName,
      category: row.category,
      scope: row.scope,
      status: row.status,
      sort: row.sort,
      remark: row.remark,
      aliases: [...row.aliases]
    });
    typeEditVisible.value = true;
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

  const submitTypeEdit = async () => {
    try {
      const res = await updateDeviceDictionaryType(
        typeEditForm.dictType,
        toTypeSavePayload(typeEditForm)
      );
      ElMessage.success(res.msg || "编辑成功");
      typeEditVisible.value = false;
      await fetchTypeList();
      await fetchModuleOptions();
    } catch (err) {
      console.error("[dict] 编辑字典类型失败:", err);
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

  const handleTypeDelete = (row: DictTypeItem) => {
    ElMessageBox.confirm(`确定要删除字典类型「${row.dictName}」吗？`, "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning"
    })
      .then(async () => {
        try {
          const res = await deleteDeviceDictionaryType(row.dictType);
          ElMessage.success(res.msg || "删除成功");
          await fetchTypeList();
          await fetchModuleOptions();
        } catch (err) {
          console.error("[dict] 删除字典类型失败:", err);
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
    await fetchModuleOptions();
    await fetchDictList(boatId.value);
    ElMessage.success("已刷新");
  };

  const handleTypeRefresh = async () => {
    typeSearchQuery.value = "";
    await fetchTypeList();
    await fetchModuleOptions();
    ElMessage.success("已刷新");
  };

  const handleExport = () => {
    const rows = requireSelectionForExport(multipleSelection.value);
    if (!rows) return;
    const exportData = rows.map(item => ({
      键名: item.name,
      键值: item.value,
      模块: item.groupName || item.groupKey,
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
      { wch: 14 },
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

    const existingKeys = new Set(
      tableData.value.map(item => dictKey(item.name, item.groupKey))
    );
    const seenInFile = new Set<string>();
    const toImport: DictSaveDTO[] = [];
    const skipLogs: { row: number; reason: string }[] = [];

    jsonData.forEach((row, index) => {
      const rowNum = index + 2;
      const keyname = String(row["键名"] || "").trim();
      const keyvalue = String(row["键值"] || "").trim();
      const groupKey = moduleKey(
        String(row["模块"] || groupFilter.value || "common")
      );
      const scopedKey = dictKey(keyname, groupKey);

      if (!keyname || !keyvalue) {
        skipLogs.push({ row: rowNum, reason: "缺少键名或键值" });
        return;
      }
      if (seenInFile.has(scopedKey)) {
        skipLogs.push({
          row: rowNum,
          reason: `模块「${
            moduleLabel(groupKey) || groupKey
          }」下键名「${keyname}」在文件内重复`
        });
        return;
      }
      if (existingKeys.has(scopedKey)) {
        skipLogs.push({
          row: rowNum,
          reason: `模块「${
            moduleLabel(groupKey) || groupKey
          }」下键名「${keyname}」已存在`
        });
        return;
      }

      seenInFile.add(scopedKey);
      existingKeys.add(scopedKey);
      toImport.push({
        _id: genId(),
        keyname,
        keyvalue,
        groupKey,
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
    activeTab,
    searchQuery,
    groupFilter,
    moduleOptions,
    filteredData,
    dataList,
    pagination,
    onSearch,
    onGroupFilterChange,
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
    handleImport,
    typeLoading,
    typeSearchQuery,
    typeDataList,
    typePagination,
    typeColumns,
    typeAddVisible,
    typeEditVisible,
    typeAddForm,
    typeEditForm,
    typeFormRules,
    handleTypeAdd,
    submitTypeAdd,
    handleTypeEdit,
    submitTypeEdit,
    handleTypeDelete,
    handleTypeRefresh
  };
}
