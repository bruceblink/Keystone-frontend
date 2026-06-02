import { ref, computed, reactive, onMounted, onUnmounted, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  batchDeleteVersionUpdate,
  deleteVersionUpdate,
  getVersionUpdateQuery,
  type VersionUpdateItemDTO
} from "@/api/boatDevice/software";
import {
  getDeviceListQuery,
  type DeviceListItemDTO
} from "@/api/boatDevice/shipForm";
import { useBoatStoreHook } from "@/store/modules/boat";
import { getGroupName } from "../../dict";
import type { UpdateRecord } from "./types";

/** 软件版本更新任务列表页：查询、筛选、轮询进度、删除 */

type DeviceMeta = { shipname_cn: string; type: string };

const normalizeDevid = (devid: unknown) => String(devid ?? "").trim();

/** 兼容后端/历史数据中项目分组字段命名不一致 */
const readDeviceType = (
  item: DeviceListItemDTO | VersionUpdateItemDTO
): string => {
  const raw = item as Record<string, unknown>;
  for (const key of ["type", "Type", "group", "group_type", "projectGroup"]) {
    const value = raw[key];
    if (value != null && value !== "") return String(value);
  }
  return "";
};

/** 以 devid 为键建立船名/分组索引，同时写入小写键以忽略大小写差异 */
const buildDeviceMetaMap = (list: DeviceListItemDTO[]) => {
  const map: Record<string, DeviceMeta> = {};
  list.forEach(item => {
    const devid = normalizeDevid(item.devid);
    if (!devid) return;
    const meta: DeviceMeta = {
      shipname_cn: item.shipname_cn ?? "",
      type: readDeviceType(item)
    };
    map[devid] = meta;
    map[devid.toLowerCase()] = meta;
  });
  return map;
};

const lookupDeviceMeta = (
  devid: string,
  map: Record<string, DeviceMeta>
): DeviceMeta | null => {
  const key = normalizeDevid(devid);
  return map[key] ?? map[key.toLowerCase()] ?? null;
};

/**
 * 将更新任务 DTO 转为表格行数据；
 * 任务接口可能不带船名/分组，需用设备列表 meta 补全展示字段
 */
const normalizeUpdate = (
  item: VersionUpdateItemDTO,
  deviceMetaMap: Record<string, DeviceMeta>
): UpdateRecord => {
  const devid = normalizeDevid(item.devid);
  const fromDevice = lookupDeviceMeta(devid, deviceMetaMap);
  const raw = item as Record<string, unknown>;
  const shipname_cn =
    (typeof raw.shipname_cn === "string" && raw.shipname_cn) ||
    (typeof raw.devname === "string" && raw.devname) ||
    fromDevice?.shipname_cn ||
    "";

  return {
    uuid: String(item.uuid ?? ""),
    devid,
    shipname_cn,
    deviceType: readDeviceType(item) || fromDevice?.type || "",
    name: String(item.name ?? ""),
    version: String(item.version ?? ""),
    size: String(item.size ?? ""),
    status: String(item.status ?? "0"),
    progress: String(item.progress ?? "0"),
    create_time: String(item.create_time ?? "")
  };
};

/** 更新任务列表页主逻辑（index.vue 使用） */
export function useUpdateList() {
  const boatStore = useBoatStoreHook();
  const updateList = ref<UpdateRecord[]>([]);
  const listLoading = ref(false);
  /** 设备维表缓存，供 normalizeUpdate 与 getShipName/getDeviceGroup 使用 */
  const deviceMetaMap = ref<Record<string, DeviceMeta>>({});

  /** 拉取全量设备并同步到 boatStore（批量更新弹窗共用同一数据源） */
  const fetchDeviceList = async () => {
    try {
      const res = await getDeviceListQuery();
      const list = Array.isArray(res.data) ? res.data : [];
      deviceMetaMap.value = buildDeviceMetaMap(list);
      boatStore.applyDeviceList(list);
      return list;
    } catch (err) {
      console.error("[software] /device/list/query 失败:", err);
      deviceMetaMap.value = {};
      boatStore.applyDeviceList([]);
      return [];
    }
  };

  const getShipName = (row: UpdateRecord) => {
    const meta = lookupDeviceMeta(row.devid, deviceMetaMap.value);
    return row.shipname_cn || meta?.shipname_cn || "";
  };

  const getDeviceGroup = (row: UpdateRecord) => {
    const meta = lookupDeviceMeta(row.devid, deviceMetaMap.value);
    const type = row.deviceType || meta?.type || "";
    return getGroupName(type);
  };

  const searchQuery = ref("");
  /** 状态 tab：all | 0 未下载 | 1 下载中 | 2 下载完成 */
  const statusFilter = ref("all");

  /** 前端筛选 + 排序：先按状态升序，同状态按更新时间倒序 */
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
          getShipName(r).toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          getDeviceGroup(r).toLowerCase().includes(q)
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

  /** 前端分页切片，不再次请求接口 */
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
    { label: "设备名称", minWidth: 120, slot: "shipname" },
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

  /** 仅查询更新任务（devid/status 为 -1 表示全部） */
  const fetchUpdateTasks = async () => {
    const res = await getVersionUpdateQuery({
      devid: "-1",
      status: "-1"
    });
    updateList.value = (res.data ?? []).map(item =>
      normalizeUpdate(item, deviceMetaMap.value)
    );
  };

  /**
   * @param silent 为 true 时不显示 loading（定时轮询、删除后静默刷新）
   * @param refreshDevices 是否同步拉取设备列表；轮询时默认 false，仅刷新任务进度
   */
  const fetchUpdateList = async (silent = false, refreshDevices = !silent) => {
    if (!silent) listLoading.value = true;
    try {
      if (refreshDevices) {
        await fetchDeviceList();
      }
      await fetchUpdateTasks();
    } catch (err) {
      console.error("[software] 更新列表加载失败:", err);
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
    await fetchUpdateList(false, true);
    ElMessage.success("已刷新");
  };

  const handleDelete = (row: UpdateRecord) => {
    ElMessageBox.confirm(
      `确定要删除设备 "${getShipName(row) || row.devid}" 的更新任务吗？`,
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

  /** 定时轮询任务进度，离开页面时 stopPolling 释放定时器 */
  let refreshTimer: ReturnType<typeof setInterval> | null = null;
  const startPolling = () => {
    stopPolling();
    refreshTimer = setInterval(() => fetchUpdateList(true, false), 10000);
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
    getShipName,
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
    fetchUpdateList,
    fetchDeviceList
  };
}
