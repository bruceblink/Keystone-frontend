import { ref, computed, reactive, onMounted, onUnmounted, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  batchDeleteVersionUpdate,
  deleteVersionUpdate,
  getVersionUpdateQuery,
  type VersionUpdateItemDTO
} from "@/api/boatDevice/software";
import { useBoatStoreHook } from "@/store/modules/boat";
import { GROUP_MAP } from "../../dict";
import type { UpdateRecord } from "./types";

const normalizeUpdate = (
  item: VersionUpdateItemDTO,
  shipNameMap: Record<string, string>
): UpdateRecord => ({
  uuid: String(item.uuid ?? ""),
  devid: String(item.devid ?? ""),
  shipname_cn: item.shipname_cn ?? shipNameMap[String(item.devid ?? "")] ?? "",
  name: String(item.name ?? ""),
  version: String(item.version ?? ""),
  size: String(item.size ?? ""),
  status: String(item.status ?? "0"),
  progress: String(item.progress ?? "0"),
  create_time: String(item.create_time ?? "")
});

export function useUpdateList() {
  const boatStore = useBoatStoreHook();
  const updateList = ref<UpdateRecord[]>([]);
  const listLoading = ref(false);

  const shipNameMap = computed<Record<string, string>>(() =>
    Object.fromEntries(boatStore.allBoats.map(b => [b.devid, b.shipname_cn]))
  );

  const getDeviceGroup = (devid: string) => {
    const boat = boatStore.allBoats.find(b => b.devid === devid);
    return boat ? GROUP_MAP[String(boat.type)] ?? "未知" : "未知";
  };

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

  const getStatusCount = (s: string) => {
    if (s === "all") return updateList.value.length;
    return updateList.value.filter(r => r.status === s).length;
  };

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

  const multipleSelection = ref<UpdateRecord[]>([]);

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

  const fetchUpdateList = async (silent = false) => {
    if (!silent) listLoading.value = true;
    try {
      if (!boatStore.allBoats.length) {
        await boatStore.fetchBoatList();
      }
      const res = await getVersionUpdateQuery({
        devid: "-1",
        status: "-1"
      });
      const map = shipNameMap.value;
      updateList.value = (res.data ?? []).map(item =>
        normalizeUpdate(item, map)
      );
    } catch (err) {
      console.error("[software] /version/update/query 失败:", err);
      if (!silent) ElMessage.error("更新列表加载失败");
      updateList.value = [];
    } finally {
      if (!silent) listLoading.value = false;
    }
  };

  const handleRefresh = async () => {
    searchQuery.value = "";
    statusFilter.value = "all";
    pagination.currentPage = 1;
    await fetchUpdateList();
    ElMessage.success("已刷新");
  };

  const handleDelete = (row: UpdateRecord) => {
    ElMessageBox.confirm(
      `确定要删除设备 "${row.shipname_cn || row.devid}" 的更新任务吗？`,
      "确认删除",
      { confirmButtonText: "确定", cancelButtonText: "取消", type: "warning" }
    )
      .then(async () => {
        await deleteVersionUpdate(row.uuid);
        ElMessage.success("删除成功");
        await fetchUpdateList(true);
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
      .then(async () => {
        const uuids = multipleSelection.value.map(r => r.uuid);
        await batchDeleteVersionUpdate(uuids);
        multipleSelection.value = [];
        ElMessage.success("批量删除成功");
        await fetchUpdateList(true);
      })
      .catch(() => {});
  };

  let refreshTimer: ReturnType<typeof setInterval> | null = null;
  const startPolling = () => {
    stopPolling();
    refreshTimer = setInterval(() => fetchUpdateList(true), 10000);
  };
  const stopPolling = () => {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
  };

  watch(statusFilter, () => {
    pagination.currentPage = 1;
  });

  onMounted(async () => {
    await fetchUpdateList();
    startPolling();
  });
  onUnmounted(stopPolling);

  return {
    updateList,
    listLoading,
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
    fetchUpdateList
  };
}
