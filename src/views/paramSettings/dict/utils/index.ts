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
import { formatDateTime, genId, getValueType, MOCK_DICTS } from "./dict";

const boatDataCache: Record<string, DictItem[]> = {};

function getBoatData(boatId: string): DictItem[] {
  if (!boatDataCache[boatId]) {
    boatDataCache[boatId] = MOCK_DICTS.map(r => ({ ...r }));
  }
  return boatDataCache[boatId];
}

export function useDictList(boatId: Ref<string>) {
  // ===== 数据源 =====
  const tableData = ref<DictItem[]>(
    boatId.value ? getBoatData(boatId.value) : []
  );

  let stopBoatWatch: (() => void) | null = null;

  function startBoatWatch() {
    stopBoatWatch?.();
    stopBoatWatch = watch(
      boatId,
      id => {
        tableData.value = id ? getBoatData(id) : [];
        pagination.currentPage = 1;
      },
      { immediate: false }
    );
  }

  onMounted(startBoatWatch);
  onBeforeUnmount(() => {
    stopBoatWatch?.();
    stopBoatWatch = null;
  });
  onActivated(() => {
    tableData.value = boatId.value ? getBoatData(boatId.value) : [];
    startBoatWatch();
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

  // ===== 分页 =====
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

  // ===== 多选 =====
  const multipleSelection = ref<DictItem[]>([]);

  // ===== 列定义 =====
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

  // ===== 表单 =====
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
    user: ""
  });

  const formRules: FormRules = {
    keyname: [{ required: true, message: "请输入键名", trigger: "blur" }],
    keyvalue: [{ required: true, message: "请输入键值", trigger: "blur" }],
    descripton: [{ required: true, message: "请输入描述", trigger: "blur" }]
  };

  const onKeyValueInput = (val: string, form: DictForm) => {
    form.type = getValueType(val);
  };

  // ===== 新增 =====
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

  const submitAdd = () => {
    if (tableData.value.find(item => item.name === addForm.keyname)) {
      ElMessage.error("该键名已存在");
      return;
    }
    tableData.value.push({
      _id: genId(),
      name: addForm.keyname,
      value: addForm.keyvalue,
      dataType: addForm.type,
      description: addForm.descripton,
      user: addForm.user,
      createdTime: formatDateTime(new Date())
    });
    addVisible.value = false;
    ElMessage.success("新增成功");
  };

  // ===== 编辑 =====
  const handleEdit = (row: DictItem) => {
    Object.assign(editForm, {
      _id: row._id,
      keyname: row.name,
      keyvalue: row.value,
      type: row.dataType,
      descripton: row.description,
      user: row.user
    });
    editVisible.value = true;
  };

  const submitEdit = () => {
    const idx = tableData.value.findIndex(item => item._id === editForm._id);
    if (idx !== -1) {
      Object.assign(tableData.value[idx], {
        value: editForm.keyvalue,
        dataType: editForm.type,
        description: editForm.descripton
      });
    }
    editVisible.value = false;
    ElMessage.success("编辑成功");
  };

  // ===== 删除 =====
  const handleDelete = (row: DictItem) => {
    ElMessageBox.confirm(`确定要删除「${row.name}」吗？`, "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning"
    })
      .then(() => {
        tableData.value = tableData.value.filter(item => item._id !== row._id);
        if (boatId.value) boatDataCache[boatId.value] = tableData.value;
        ElMessage.success("删除成功");
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
      .then(() => {
        const ids = new Set(multipleSelection.value.map(r => r._id));
        tableData.value = tableData.value.filter(item => !ids.has(item._id));
        if (boatId.value) boatDataCache[boatId.value] = tableData.value;
        multipleSelection.value = [];
        ElMessage.success("批量删除成功");
      })
      .catch(() => {});
  };

  // ===== 刷新 =====
  const handleRefresh = () => {
    if (boatId.value) {
      boatDataCache[boatId.value] = MOCK_DICTS.map(r => ({ ...r }));
      tableData.value = boatDataCache[boatId.value];
    } else {
      tableData.value = [];
    }
    searchQuery.value = "";
    pagination.currentPage = 1;
    ElMessage.success("已刷新");
  };

  // ===== 导出 =====
  const handleExport = () => {
    const rows = multipleSelection.value.length
      ? multipleSelection.value
      : filteredData.value;
    if (!rows.length) {
      ElMessage.warning("暂无数据可导出");
      return;
    }
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

  // ===== 导入 =====
  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx,.xls";
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev: ProgressEvent<FileReader>) => {
        try {
          const data = new Uint8Array(ev.target!.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: "array", cellDates: true });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(
            ws,
            { raw: false, defval: "" }
          );
          const existingKeys = new Set(tableData.value.map(item => item.name));
          const seenKeys = new Set<string>();
          let added = 0;
          let skipped = 0;
          jsonData.forEach(row => {
            const keyname = String(row["键名"] || "").trim();
            const keyvalue = String(row["键值"] || "").trim();
            if (!keyname || !keyvalue) return;
            if (seenKeys.has(keyname) || existingKeys.has(keyname)) {
              skipped++;
              return;
            }
            seenKeys.add(keyname);
            tableData.value.push({
              _id: genId(),
              name: keyname,
              value: keyvalue,
              dataType: getValueType(keyvalue),
              description: String(row["描述"] || ""),
              user: localStorage.getItem("username") || "",
              createdTime: formatDateTime(new Date())
            });
            existingKeys.add(keyname);
            added++;
          });
          if (added > 0) {
            ElMessage.success(
              `导入成功 ${added} 条${
                skipped ? `，跳过 ${skipped} 条（键名重复）` : ""
              }`
            );
          } else {
            ElMessage.warning("未导入任何数据（键名重复或格式有误）");
          }
        } catch {
          ElMessage.error("读取文件失败");
        }
      };
      reader.readAsArrayBuffer(file);
    };
    input.click();
  };

  return {
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
