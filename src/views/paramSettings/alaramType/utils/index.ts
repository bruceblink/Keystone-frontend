import { ref, computed, reactive } from "vue";
import { ElMessage, ElMessageBox, type FormRules } from "element-plus";
import * as XLSX from "xlsx";
import type { AlarmTypeItem, AlarmTypeForm } from "./types";
import { formatDateTime, genId, TYPE_MAP, MOCK_ALARM_TYPES } from "./dict";

export function useAlarmTypeList() {
  // ===== 数据源 =====
  const tableData = ref<AlarmTypeItem[]>(MOCK_ALARM_TYPES.map(r => ({ ...r })));

  // ===== 搜索 =====
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
  const multipleSelection = ref<AlarmTypeItem[]>([]);

  // ===== 列定义 =====
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

  // ===== 表单 =====
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

  // ===== 校验规则 =====
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

  // ===== 开关切换 =====
  const handleSwitchChange = (row: AlarmTypeItem) => {
    const idx = tableData.value.findIndex(item => item._id === row._id);
    if (idx !== -1) Object.assign(tableData.value[idx], row);
    ElMessage.success("切换成功");
  };

  // ===== 新增 =====
  const handleAdd = () => {
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

  const submitAdd = () => {
    if (tableData.value.some(item => item.id === addForm.id)) {
      ElMessage.error("该报警编号已存在");
      return;
    }
    tableData.value.push({
      _id: genId(),
      id: addForm.id,
      des: addForm.des,
      type: addForm.type,
      alarmid: addForm.alarmid,
      s2cloud: addForm.s2cloud,
      s2ship: addForm.s2ship,
      visibility: addForm.visibility,
      create_time: formatDateTime(new Date()),
      user: localStorage.getItem("username") || ""
    });
    addVisible.value = false;
    ElMessage.success("新增成功");
  };

  // ===== 编辑 =====
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

  const submitEdit = () => {
    const idx = tableData.value.findIndex(item => item._id === editForm._id);
    if (idx !== -1) {
      Object.assign(tableData.value[idx], {
        des: editForm.des,
        type: editForm.type,
        alarmid: editForm.alarmid,
        s2cloud: editForm.s2cloud,
        s2ship: editForm.s2ship,
        visibility: editForm.visibility
      });
    }
    editVisible.value = false;
    ElMessage.success("编辑成功");
  };

  // ===== 删除 =====
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
      .then(() => {
        tableData.value = tableData.value.filter(item => item._id !== row._id);
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
      `确定要删除选中的 ${multipleSelection.value.length} 条数据吗？`,
      "提示",
      { confirmButtonText: "确定", cancelButtonText: "取消", type: "warning" }
    )
      .then(() => {
        const ids = new Set(multipleSelection.value.map(r => r._id));
        tableData.value = tableData.value.filter(item => !ids.has(item._id));
        multipleSelection.value = [];
        ElMessage.success("批量删除成功");
      })
      .catch(() => {});
  };

  // ===== 刷新 =====
  const handleRefresh = () => {
    tableData.value = MOCK_ALARM_TYPES.map(r => ({ ...r }));
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
            {
              raw: false,
              defval: ""
            }
          );
          const existingIds = new Set(tableData.value.map(item => item.id));
          const existingDes = new Set(tableData.value.map(item => item.des));
          const seenIds = new Set<string>();
          let added = 0;
          let skipped = 0;
          jsonData.forEach(row => {
            const id = String(row["报警编号"] || "").trim();
            const des = String(row["报警类型名称"] || "").trim();
            const typeLabel = String(row["类型"] || "").trim();
            const alarmid = String(row["分组编号"] || "").trim();
            if (!id || !des || !alarmid) return;
            if (!/^\d+$/.test(id) || !/^[\u4e00-\u9fa5a-zA-Z]+$/.test(des)) {
              skipped++;
              return;
            }
            if (
              seenIds.has(id) ||
              existingIds.has(id) ||
              existingDes.has(des)
            ) {
              skipped++;
              return;
            }
            const type =
              typeLabel === "记录" ? "0" : typeLabel === "报警" ? "1" : "1";
            const toFlag = (v: string) => (v === "是" || v === "1" ? "1" : "0");
            seenIds.add(id);
            existingIds.add(id);
            existingDes.add(des);
            tableData.value.push({
              _id: genId(),
              id,
              des,
              type,
              alarmid,
              s2cloud: toFlag(String(row["云端同步"] || "")),
              s2ship: toFlag(String(row["船端同步"] || "")),
              visibility: toFlag(String(row["可见状态"] || "")),
              create_time: formatDateTime(new Date()),
              user: localStorage.getItem("username") || ""
            });
            added++;
          });
          if (added > 0) {
            ElMessage.success(
              `导入成功 ${added} 条${
                skipped ? `，跳过 ${skipped} 条（重复或格式有误）` : ""
              }`
            );
          } else {
            ElMessage.warning("未导入任何数据（重复或格式有误）");
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
