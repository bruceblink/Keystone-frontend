import { ref, computed, reactive, onMounted, onUnmounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import type { UpdateRecord } from "./types";
import { GROUP_MAP, MOCK_UPDATES, MOCK_DEVICES } from "./dict";

export function useUpdateList() {
  // ===== 数据源 =====
  const updateList = ref<UpdateRecord[]>(MOCK_UPDATES.map(r => ({ ...r })));

  const getDeviceGroup = (devid: string) => {
    const d = MOCK_DEVICES.find(x => x.devid === devid);
    return d ? GROUP_MAP[d.type] || "未知" : "未知";
  };

  // ===== 搜索 & 筛选 =====
  const searchQuery = ref("");
  const statusFilter = ref("all");

  const filteredList = computed(() => {
    let list = [...updateList.value];
    if (statusFilter.value !== "all") {
      list = list.filter(r => r.status === statusFilter.value);
    }
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.trim().toLowerCase();
      list = list.filter(
        r =>
          r.devid.toLowerCase().includes(q) ||
          r.shipname_cn.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          getDeviceGroup(r.devid).toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => {
      if (a.status !== b.status) return +a.status - +b.status;
      return (
        new Date(b.create_time).getTime() - new Date(a.create_time).getTime()
      );
    });
  });

  const getStatusCount = (s: string) =>
    s === "all"
      ? updateList.value.length
      : updateList.value.filter(r => r.status === s).length;

  // ===== 分页 =====
  const pagination = reactive({
    currentPage: 1,
    pageSize: 15,
    total: 0,
    background: true
  });

  const dataList = computed(() => {
    pagination.total = filteredList.value.length;
    const start = (pagination.currentPage - 1) * pagination.pageSize;
    return filteredList.value.slice(start, start + pagination.pageSize);
  });

  const onSearch = () => {
    pagination.currentPage = 1;
  };

  // ===== 多选 =====
  const multipleSelection = ref<UpdateRecord[]>([]);

  // ===== 列定义 =====
  const columns: TableColumnList = [
    { type: "selection", align: "center", width: 50 },
    { label: "设备编号", prop: "devid", minWidth: 110 },
    { label: "设备名称", prop: "shipname_cn", minWidth: 120 },
    { label: "项目分组", minWidth: 100, slot: "group" },
    { label: "软件名称", prop: "name", minWidth: 110 },
    { label: "目标版本", prop: "version", minWidth: 100 },
    { label: "文件大小(MB)", prop: "size", minWidth: 110 },
    { label: "状态", prop: "status", minWidth: 110, slot: "status" },
    { label: "进度", minWidth: 160, slot: "progress" },
    {
      label: "更新时间",
      prop: "create_time",
      sortable: true,
      minWidth: 160
    },
    { label: "操作", fixed: "right", minWidth: 80, slot: "operation" }
  ];

  // ===== 刷新 =====
  const handleRefresh = () => {
    updateList.value = MOCK_UPDATES.map(r => ({ ...r }));
    searchQuery.value = "";
    statusFilter.value = "all";
    pagination.currentPage = 1;
    ElMessage.success("已刷新");
  };

  // ===== 删除 =====
  const handleDelete = (row: UpdateRecord) => {
    ElMessageBox.confirm(
      `确定要删除设备 "${row.shipname_cn}" 的更新任务吗？`,
      "确认删除",
      { confirmButtonText: "确定", cancelButtonText: "取消", type: "warning" }
    )
      .then(() => {
        updateList.value = updateList.value.filter(r => r.uuid !== row.uuid);
        ElMessage.success("删除成功");
      })
      .catch(() => {});
  };

  const handleBatchDelete = () => {
    if (!multipleSelection.value.length) {
      ElMessage.warning("请选择要删除的任务");
      return;
    }
    ElMessageBox.confirm(
      `确定要删除选中的 ${multipleSelection.value.length} 个更新任务吗？`,
      "确认批量删除",
      { confirmButtonText: "确定", cancelButtonText: "取消", type: "warning" }
    )
      .then(() => {
        const uuids = new Set(multipleSelection.value.map(r => r.uuid));
        updateList.value = updateList.value.filter(r => !uuids.has(r.uuid));
        multipleSelection.value = [];
        ElMessage.success("批量删除成功");
      })
      .catch(() => {});
  };

  // ===== 定时模拟进度推进 =====
  let timer: ReturnType<typeof setInterval> | null = null;
  onMounted(() => {
    timer = setInterval(() => {
      updateList.value.forEach(r => {
        if (r.status === "1") {
          const p = Math.min(parseFloat(r.progress) + Math.random() * 3, 100);
          r.progress = p.toFixed(1);
          if (p >= 100) r.status = "2";
        }
      });
    }, 3000);
  });
  onUnmounted(() => {
    if (timer) clearInterval(timer);
  });

  // ===== 追加新任务（供父组件调用） =====
  const addUpdateRecords = (records: UpdateRecord[]) => {
    records.forEach(r => {
      const idx = updateList.value.findIndex(
        x => x.devid === r.devid && x.name === r.name
      );
      if (idx >= 0) {
        updateList.value[idx] = { ...r };
      } else {
        updateList.value.unshift({ ...r });
      }
    });
  };

  return {
    updateList,
    getDeviceGroup,
    searchQuery,
    statusFilter,
    filteredList,
    getStatusCount,
    pagination,
    dataList,
    onSearch,
    multipleSelection,
    columns,
    handleRefresh,
    handleDelete,
    handleBatchDelete,
    addUpdateRecords
  };
}
