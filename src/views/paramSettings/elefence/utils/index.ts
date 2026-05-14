import { ref, computed, reactive, watch } from "vue";
import {
  ElMessage,
  ElMessageBox,
  type FormInstance,
  type FormRules
} from "element-plus";
import * as XLSX from "xlsx";
import type { FenceItem, FenceForm, GeoPoint } from "./types";
import {
  AREA_TYPE_OPTIONS,
  AREA_TYPE_MAP,
  DATA_TYPE_MAP,
  MOCK_FENCES,
  formatPoints,
  formatDateTime,
  genId
} from "./dict";

export function useFenceList() {
  // ===== 数据源 =====
  const tableData = ref<FenceItem[]>(
    MOCK_FENCES.map(r => ({ ...r, data: r.data.map(p => ({ ...p })) }))
  );

  // ===== 搜索 =====
  const searchQuery = ref("");

  const filteredData = computed(() => {
    let list = [...tableData.value];
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase();
      list = list.filter(
        item =>
          item.name?.toLowerCase().includes(q) ||
          (AREA_TYPE_MAP[item.areatype] || "").toLowerCase().includes(q)
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
  const addFormRef = ref<FormInstance | null>(null);
  const editFormRef = ref<FormInstance | null>(null);

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

  const submitAdd = () => {
    addFormRef.value?.validate(valid => {
      if (!valid) return;
      if (tableData.value.find(item => item.name === addForm.name)) {
        ElMessage.error("区域名称已存在，请使用其他名称");
        return;
      }
      tableData.value.push({
        sid: genId(),
        areatype: addForm.areatype,
        name: addForm.name,
        datatype: addForm.datatype,
        data: addForm.data.map(p => ({ ...p })),
        user: addForm.user,
        create_time: formatDateTime(new Date())
      });
      addVisible.value = false;
      ElMessage.success("新增成功");
    });
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

  const submitEdit = () => {
    editFormRef.value?.validate(valid => {
      if (!valid) return;
      const duplicate = tableData.value.find(
        item => item.name === editForm.name && item.sid !== editForm.sid
      );
      if (duplicate) {
        ElMessage.error("区域名称已存在，请使用其他名称");
        return;
      }
      const idx = tableData.value.findIndex(item => item.sid === editForm.sid);
      if (idx !== -1) {
        Object.assign(tableData.value[idx], {
          areatype: editForm.areatype,
          name: editForm.name,
          datatype: editForm.datatype,
          data: editForm.data.map(p => ({ ...p }))
        });
      }
      editVisible.value = false;
      ElMessage.success("编辑成功");
    });
  };

  // ===== 删除 =====
  const handleDelete = (row: FenceItem) => {
    ElMessageBox.confirm(`确定要删除区域「${row.name}」吗？`, "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning"
    })
      .then(() => {
        tableData.value = tableData.value.filter(item => item.sid !== row.sid);
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
        const ids = new Set(multipleSelection.value.map(r => r.sid));
        tableData.value = tableData.value.filter(item => !ids.has(item.sid));
        multipleSelection.value = [];
        ElMessage.success("批量删除成功");
      })
      .catch(() => {});
  };

  // ===== 刷新 =====
  const handleRefresh = () => {
    tableData.value = MOCK_FENCES.map(r => ({
      ...r,
      data: r.data.map(p => ({ ...p }))
    }));
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
      水域类型: AREA_TYPE_MAP[item.areatype] || item.areatype,
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
          const wb = XLSX.read(data, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(
            ws,
            {
              raw: false,
              defval: ""
            }
          );

          const labelToValue = Object.fromEntries(
            AREA_TYPE_OPTIONS.map(o => [o.label, o.value])
          );
          const existingNames = new Set(tableData.value.map(item => item.name));
          const seenNames = new Set<string>();
          let added = 0;
          let skipped = 0;

          jsonData.forEach(row => {
            const areaLabel = String(row["水域类型"] || "").trim();
            const name = String(row["区域名称"] || "").trim();
            const dtLabel = String(row["数据类型"] || "").trim();
            const posStr = String(row["位置数据"] || "").trim();

            if (!areaLabel || !name || !dtLabel || !posStr) return;
            if (seenNames.has(name) || existingNames.has(name)) {
              skipped++;
              return;
            }

            const areaValue = labelToValue[areaLabel];
            if (!areaValue) {
              skipped++;
              return;
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
              skipped++;
              return;
            }

            let points: GeoPoint[] = [];
            try {
              points = posStr.split(";").map(seg => {
                const clean = seg.replace(/[()]/g, "").trim();
                const [lng, lat] = clean.split(",").map(Number);
                return { lng: isNaN(lng) ? 0 : lng, lat: isNaN(lat) ? 0 : lat };
              });
            } catch {
              skipped++;
              return;
            }

            seenNames.add(name);
            existingNames.add(name);
            tableData.value.push({
              sid: genId(),
              areatype: areaValue,
              name,
              datatype: dtValue,
              data: points,
              user: localStorage.getItem("username") || "",
              create_time: formatDateTime(new Date())
            });
            added++;
          });

          if (added > 0) {
            ElMessage.success(
              `导入成功 ${added} 条${skipped ? `，跳过 ${skipped} 条` : ""}`
            );
          } else {
            ElMessage.warning(
              "未导入任何数据（重复、格式有误或水域类型不存在）"
            );
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
    addFormRef,
    editFormRef,
    addForm,
    editForm,
    addRules,
    editRules,
    areaOptions: AREA_TYPE_OPTIONS,
    areaTypeMap: AREA_TYPE_MAP,
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
