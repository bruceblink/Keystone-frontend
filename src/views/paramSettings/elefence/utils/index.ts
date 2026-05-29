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
import type { FenceItem, FenceForm, GeoPoint } from "./types";
import {
  addFenceList,
  deleteFenceList,
  getFenceListQuery,
  updateFenceList,
  type FenceListItemDTO,
  type FenceSaveDTO
} from "@/api/paramSettings/elefence";
import {
  getComboxDictQuery,
  normalizeComboxOptions,
  type ComboxOption
} from "@/api/paramSettings/combox";
import {
  AREA_TYPE_COMBOX_NAME,
  DATA_TYPE_MAP,
  formatPoints,
  genId
} from "./dict";
import {
  isExcelFile,
  logImportFailures,
  readExcelJsonRows,
  requireSelectionForExport,
  showImportResult
} from "../../importExport";

function parseFenceData(data: unknown): GeoPoint[] {
  if (Array.isArray(data)) {
    return data.map(p => ({
      lng: Number((p as GeoPoint).lng) || 0,
      lat: Number((p as GeoPoint).lat) || 0
    }));
  }
  if (typeof data === "string" && data.trim()) {
    try {
      return parseFenceData(JSON.parse(data));
    } catch {
      return [];
    }
  }
  return [];
}

const normalizeFence = (item: FenceListItemDTO): FenceItem => ({
  sid: String(item.sid ?? genId()),
  areatype: String(item.areatype ?? ""),
  name: item.name ?? "",
  datatype: String(item.datatype ?? ""),
  data: parseFenceData(item.data),
  user: item.user ?? "",
  create_time: item.create_time ?? ""
});

export function useFenceList(boatId: Ref<string>) {
  // ===== 数据源 =====
  const tableData = ref<FenceItem[]>([]);
  const loading = ref(false);
  const areaTypeOptions = ref<ComboxOption[]>([]);

  const areaTypeMap = computed<Record<string, string>>(() =>
    Object.fromEntries(areaTypeOptions.value.map(o => [o.value, o.label]))
  );

  const fetchAreaTypeOptions = async (devid?: string) => {
    const id = devid ?? boatId.value;
    if (!id) {
      areaTypeOptions.value = [];
      return;
    }
    try {
      const res = await getComboxDictQuery({
        name: AREA_TYPE_COMBOX_NAME,
        devid: id
      });
      areaTypeOptions.value = normalizeComboxOptions(res.data);
    } catch (err) {
      console.error("[elefence] 查询水域类型失败:", err);
      areaTypeOptions.value = [];
    }
  };

  const fetchFenceList = async (devid?: string) => {
    const id = devid ?? boatId.value;
    if (!id) {
      tableData.value = [];
      return;
    }
    loading.value = true;
    try {
      const res = await getFenceListQuery({ devid: id });
      const list = Array.isArray(res.data) ? res.data : [];
      tableData.value = list.map(normalizeFence);
      pagination.currentPage = 1;
    } catch (err) {
      console.error("[elefence] 查询电子围栏失败:", err);
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
          fetchAreaTypeOptions(id);
          fetchFenceList(id);
        } else {
          areaTypeOptions.value = [];
          tableData.value = [];
          pagination.currentPage = 1;
        }
      },
      { immediate: false }
    );
  }

  onMounted(() => {
    startBoatWatch();
    if (boatId.value) {
      fetchAreaTypeOptions(boatId.value);
      fetchFenceList(boatId.value);
    }
  });
  onBeforeUnmount(() => {
    stopBoatWatch?.();
    stopBoatWatch = null;
  });
  onActivated(() => {
    startBoatWatch();
    if (boatId.value) {
      fetchAreaTypeOptions(boatId.value);
      fetchFenceList(boatId.value);
    }
  });
  onDeactivated(() => {
    stopBoatWatch?.();
    stopBoatWatch = null;
  });

  // ===== 搜索 =====
  const searchQuery = ref("");

  const filteredData = computed(() => {
    let list = [...tableData.value];
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase();
      list = list.filter(
        item =>
          item.name?.toLowerCase().includes(q) ||
          (areaTypeMap.value[item.areatype] || "").toLowerCase().includes(q)
      );
    }
    return list.sort(
      (a, b) =>
        new Date(b.create_time || 0).getTime() -
        new Date(a.create_time || 0).getTime()
    );
  });

  const onSearch = () => {
    pagination.currentPage = 1;
  };

  // ===== 分页 =====
  const pagination = reactive({
    currentPage: 1,
    pageSize: 15,
    total: 0,
    background: true
  });

  const dataList = computed(() => {
    pagination.total = filteredData.value.length;
    const start = (pagination.currentPage - 1) * pagination.pageSize;
    return filteredData.value.slice(start, start + pagination.pageSize);
  });

  // ===== 多选 =====
  const multipleSelection = ref<FenceItem[]>([]);

  // ===== 列定义 =====
  const columns: TableColumnList = [
    { type: "selection", width: 55, reserveSelection: true },
    { label: "水域类型", prop: "areatype", width: 120, slot: "areatype" },
    {
      label: "区域名称",
      prop: "name",
      minWidth: 160,
      showOverflowTooltip: true
    },
    { label: "数据类型", prop: "datatype", width: 100, slot: "datatype" },
    {
      label: "位置数据",
      prop: "data",
      minWidth: 200,
      showOverflowTooltip: true,
      slot: "data"
    },
    { label: "用户", prop: "user", width: 100 },
    { label: "创建时间", prop: "create_time", width: 170 },
    { label: "操作", fixed: "right", width: 160, slot: "operation" }
  ];

  // ===== 对话框 & 表单 =====
  const addVisible = ref(false);
  const editVisible = ref(false);

  const addForm = reactive<FenceForm>({
    areatype: "",
    name: "",
    datatype: "",
    data: [{ lng: 0, lat: 0 }],
    user: ""
  });

  const editForm = reactive<FenceForm>({
    sid: "",
    areatype: "",
    name: "",
    datatype: "",
    data: [{ lng: 0, lat: 0 }],
    user: ""
  });

  function makeDataValidator(getForm: () => FenceForm) {
    return (_rule: any, value: GeoPoint[], callback: (e?: Error) => void) => {
      const form = getForm();
      if (!value || value.length === 0) {
        callback(new Error("请添加位置数据"));
        return;
      }
      if (form.datatype === "1" && value.length > 1) {
        callback(new Error("点类型只能有一个位置数据"));
        return;
      }
      if (form.datatype === "0" && value.length < 3) {
        callback(new Error("区域类型至少需要三个位置数据"));
        return;
      }
      callback();
    };
  }

  const addRules: FormRules = {
    datatype: [
      { required: true, message: "请选择数据类型", trigger: "change" }
    ],
    areatype: [
      { required: true, message: "请选择水域类型", trigger: "change" }
    ],
    name: [
      { required: true, message: "请输入区域名称", trigger: "blur" },
      {
        min: 1,
        max: 50,
        message: "区域名称长度在 1-50 个字符之间",
        trigger: "blur"
      }
    ],
    data: [
      { required: true, message: "请添加位置数据", trigger: "change" },
      { validator: makeDataValidator(() => addForm), trigger: "change" }
    ]
  };

  const editRules: FormRules = {
    datatype: [
      { required: true, message: "请选择数据类型", trigger: "change" }
    ],
    areatype: [
      { required: true, message: "请选择水域类型", trigger: "change" }
    ],
    name: [
      { required: true, message: "请输入区域名称", trigger: "blur" },
      {
        min: 1,
        max: 50,
        message: "区域名称长度在 1-50 个字符之间",
        trigger: "blur"
      }
    ],
    data: [
      { required: true, message: "请添加位置数据", trigger: "change" },
      { validator: makeDataValidator(() => editForm), trigger: "change" }
    ]
  };

  // 切换数据类型时自动调整点数
  watch(
    () => addForm.datatype,
    newVal => {
      if (newVal === "1") {
        addForm.data = [addForm.data[0] || { lng: 0, lat: 0 }];
      } else if (newVal === "0") {
        while (addForm.data.length < 3) addForm.data.push({ lng: 0, lat: 0 });
      }
    }
  );

  watch(
    () => editForm.datatype,
    newVal => {
      if (newVal === "1") {
        editForm.data = [editForm.data[0] || { lng: 0, lat: 0 }];
      } else if (newVal === "0") {
        while (editForm.data.length < 3) editForm.data.push({ lng: 0, lat: 0 });
      }
    }
  );

  // ===== 新增 =====
  const handleAdd = () => {
    if (!boatId.value) {
      ElMessage.warning("请先选择船只");
      return;
    }
    Object.assign(addForm, {
      sid: genId(),
      areatype: "",
      name: "",
      datatype: "",
      data: [{ lng: 0, lat: 0 }],
      user: localStorage.getItem("username") || ""
    });
    addVisible.value = true;
  };

  const addPoint = () => {
    if (addForm.datatype === "1") {
      ElMessage.warning("点类型只能有一个位置数据");
      return;
    }
    addForm.data.push({ lng: 0, lat: 0 });
  };

  const removePoint = (idx: number) => {
    if (addForm.datatype === "0" && addForm.data.length <= 3) {
      ElMessage.warning("区域类型至少需要三个位置数据");
      return;
    }
    addForm.data.splice(idx, 1);
  };

  const submitAdd = async () => {
    if (!boatId.value) {
      ElMessage.warning("请先选择船只");
      return;
    }
    if (tableData.value.find(item => item.name === addForm.name)) {
      ElMessage.error("区域名称已存在，请使用其他名称");
      return;
    }
    try {
      const res = await addFenceList({
        sid: addForm.sid || genId(),
        datatype: addForm.datatype,
        areatype: addForm.areatype,
        name: addForm.name,
        data: addForm.data.map(p => ({ ...p })),
        devid: boatId.value,
        user: addForm.user || localStorage.getItem("username") || "",
        create_time: ""
      });
      ElMessage.success(res.msg || "新增成功");
      addVisible.value = false;
      await fetchFenceList(boatId.value);
    } catch (err) {
      console.error("[elefence] 新增电子围栏失败:", err);
    }
  };

  // ===== 编辑 =====
  const handleEdit = (row: FenceItem) => {
    Object.assign(editForm, {
      sid: row.sid,
      areatype: row.areatype,
      name: row.name,
      datatype: row.datatype,
      data: row.data.map(p => ({ ...p })),
      user: row.user
    });
    editVisible.value = true;
  };

  const addEditPoint = () => {
    if (editForm.datatype === "1") {
      ElMessage.warning("点类型只能有一个位置数据");
      return;
    }
    editForm.data.push({ lng: 0, lat: 0 });
  };

  const removeEditPoint = (idx: number) => {
    if (editForm.datatype === "0" && editForm.data.length <= 3) {
      ElMessage.warning("区域类型至少需要三个位置数据");
      return;
    }
    editForm.data.splice(idx, 1);
  };

  const submitEdit = async () => {
    if (!boatId.value) {
      ElMessage.warning("请先选择船只");
      return;
    }
    const duplicate = tableData.value.find(
      item => item.name === editForm.name && item.sid !== editForm.sid
    );
    if (duplicate) {
      ElMessage.error("区域名称已存在，请使用其他名称");
      return;
    }
    const origin = tableData.value.find(item => item.sid === editForm.sid);
    try {
      const res = await updateFenceList({
        sid: editForm.sid!,
        datatype: editForm.datatype,
        areatype: editForm.areatype,
        name: editForm.name,
        data: editForm.data.map(p => ({ ...p })),
        devid: boatId.value,
        user: editForm.user || localStorage.getItem("username") || "",
        create_time: origin?.create_time ?? ""
      });
      ElMessage.success(res.msg || "编辑成功");
      editVisible.value = false;
      await fetchFenceList(boatId.value);
    } catch (err) {
      console.error("[elefence] 编辑电子围栏失败:", err);
    }
  };

  // ===== 删除 =====
  const handleDelete = (row: FenceItem) => {
    ElMessageBox.confirm(`确定要删除区域「${row.name}」吗？`, "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning"
    })
      .then(async () => {
        try {
          const res = await deleteFenceList(row.sid);
          ElMessage.success(res.msg || "删除成功");
          if (boatId.value) await fetchFenceList(boatId.value);
        } catch (err) {
          console.error("[elefence] 删除电子围栏失败:", err);
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
            await deleteFenceList(row.sid);
            success++;
          } catch {
            failed++;
          }
        }
        multipleSelection.value = [];
        if (boatId.value) await fetchFenceList(boatId.value);
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

  // ===== 刷新 =====
  const handleRefresh = async () => {
    if (!boatId.value) {
      ElMessage.warning("请先选择船只");
      return;
    }
    searchQuery.value = "";
    await Promise.all([
      fetchAreaTypeOptions(boatId.value),
      fetchFenceList(boatId.value)
    ]);
    ElMessage.success("已刷新");
  };

  // ===== 导出 =====
  const handleExport = () => {
    const rows = requireSelectionForExport(multipleSelection.value);
    if (!rows) return;
    const exportData = rows.map(item => ({
      水域类型: areaTypeMap.value[item.areatype] || item.areatype,
      区域名称: item.name,
      数据类型: DATA_TYPE_MAP[item.datatype] || item.datatype,
      位置数据: formatPoints(item.data)
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    ws["!cols"] = [
      { wch: Math.max(15, ...exportData.map(r => String(r.水域类型).length)) },
      { wch: Math.max(20, ...exportData.map(r => String(r.区域名称).length)) },
      { wch: 10 },
      { wch: Math.max(50, ...exportData.map(r => String(r.位置数据).length)) }
    ];
    XLSX.utils.book_append_sheet(wb, ws, "电子围栏数据");
    XLSX.writeFile(wb, "电子围栏数据.xlsx");
    ElMessage.success("导出成功");
  };

  const parseImportRow = (
    row: Record<string, string>,
    labelToValue: Record<string, string>,
    existingNames: Set<string>,
    seenNames: Set<string>
  ): { payload?: FenceSaveDTO; reason?: string } => {
    const areaLabel = String(row["水域类型"] || "").trim();
    const name = String(row["区域名称"] || "").trim();
    const dtLabel = String(row["数据类型"] || "").trim();
    const posStr = String(row["位置数据"] || "").trim();

    if (!areaLabel || !name || !dtLabel || !posStr) {
      return { reason: "缺少水域类型、区域名称、数据类型或位置数据" };
    }
    if (seenNames.has(name)) {
      return { reason: `区域名称「${name}」在文件内重复` };
    }
    if (existingNames.has(name)) {
      return { reason: `区域名称「${name}」已存在` };
    }

    const areaValue = labelToValue[areaLabel];
    if (!areaValue) {
      return { reason: `水域类型「${areaLabel}」无效` };
    }

    const dtValue =
      dtLabel === "区域"
        ? "0"
        : dtLabel === "点"
        ? "1"
        : dtLabel === "线"
        ? "2"
        : "";
    if (!dtValue) {
      return { reason: `数据类型「${dtLabel}」无效（应为区域/点/线）` };
    }

    let points: GeoPoint[] = [];
    try {
      points = posStr.split(";").map(seg => {
        const clean = seg.replace(/[()]/g, "").trim();
        const [lng, lat] = clean.split(",").map(Number);
        return { lng: isNaN(lng) ? 0 : lng, lat: isNaN(lat) ? 0 : lat };
      });
    } catch {
      return { reason: "位置数据格式错误" };
    }

    if (dtValue === "1" && points.length !== 1) {
      return { reason: "点类型需且仅需 1 个坐标" };
    }
    if (dtValue === "0" && points.length < 3) {
      return { reason: "区域类型至少需要 3 个坐标" };
    }
    if (!points.length) {
      return { reason: "位置数据为空" };
    }

    seenNames.add(name);
    existingNames.add(name);

    return {
      payload: {
        sid: genId(),
        areatype: areaValue,
        name,
        datatype: dtValue,
        data: points,
        devid: boatId.value,
        user: localStorage.getItem("username") || "",
        create_time: ""
      }
    };
  };

  const importFencesFromFile = async (file: File) => {
    if (!isExcelFile(file)) {
      ElMessage.error("请选择 Excel 文件（.xlsx 或 .xls）");
      return;
    }

    await fetchFenceList(boatId.value);
    const jsonData = await readExcelJsonRows(file);
    if (!jsonData.length) {
      ElMessage.warning("文件中没有可导入的数据");
      return;
    }

    const labelToValue = Object.fromEntries(
      areaTypeOptions.value.map(o => [o.label, o.value])
    );
    const existingNames = new Set(tableData.value.map(item => item.name));
    const seenNames = new Set<string>();
    const toImport: FenceSaveDTO[] = [];
    const skipLogs: { row: number; reason: string }[] = [];

    jsonData.forEach((row, index) => {
      const rowNum = index + 2;
      const { payload, reason } = parseImportRow(
        row,
        labelToValue,
        existingNames,
        seenNames
      );
      if (payload) {
        toImport.push(payload);
      } else if (reason) {
        skipLogs.push({ row: rowNum, reason });
      }
    });

    const skipped = skipLogs.length;
    if (!toImport.length) {
      logImportFailures("elefence", skipLogs);
      ElMessage.warning("未导入任何数据，请检查文件内容");
      return;
    }

    loading.value = true;
    let added = 0;
    let apiFailed = 0;
    try {
      for (const payload of toImport) {
        try {
          await addFenceList(payload);
          added++;
        } catch {
          apiFailed++;
        }
      }
      await fetchFenceList(boatId.value);
      logImportFailures("elefence", skipLogs);
      showImportResult(added, skipped, apiFailed);
    } finally {
      loading.value = false;
    }
  };

  // ===== 导入 =====
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
      importFencesFromFile(file).catch(err => {
        console.error("[elefence] 导入失败:", err);
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
    addRules,
    editRules,
    areaOptions: areaTypeOptions,
    areaTypeMap,
    dataTypeMap: DATA_TYPE_MAP,
    formatPoints,
    handleAdd,
    addPoint,
    removePoint,
    submitAdd,
    handleEdit,
    addEditPoint,
    removeEditPoint,
    submitEdit,
    handleDelete,
    handleBatchDelete,
    handleRefresh,
    handleExport,
    handleImport
  };
}
