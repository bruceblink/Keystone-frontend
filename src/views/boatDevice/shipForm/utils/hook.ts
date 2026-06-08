import { ref, computed, reactive, onMounted, onActivated } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { useBoatStoreHook } from "@/store/modules/boat";
import * as XLSX from "xlsx";
import type { DeviceRecord, SearchParams } from "./types";
import { GROUP_MAP, NAV_STATUS_MAP, getOnlineStatus } from "./dict";
import {
  addDeviceList,
  deleteDeviceList,
  getDeviceListQuery,
  updateDeviceList,
  type DeviceSaveDTO,
  type DeviceListItemDTO
} from "@/api/boatDevice/shipForm";

import StarFilled from "@iconify-icons/ep/star-filled";
import Star from "@iconify-icons/ep/star";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

const SEARCH_STORAGE_KEY = "adminShipFormLastSearch";

const emptySearchParams = (): SearchParams => ({
  keyword: "",
  type: "",
  navstatus: "",
  onlineStatus: "",
  showFavoriteOnly: false
});

export function useBoatDeviceHook() {
  const router = useRouter();
  const boatStore = useBoatStoreHook();

  // ===== 数据源 =====
  const tableData = ref<DeviceRecord[]>([]);
  const loading = ref(false);

  const normalizeDevice = (item: DeviceListItemDTO): DeviceRecord => ({
    devid: String(item.devid ?? ""),
    shipname_cn: item.shipname_cn ?? "",
    shipname_en: item.shipname_en ?? "",
    type: String(item.type ?? ""),
    mmsi: String(item.mmsi ?? "").trim(),
    lng: String(item.lng ?? ""),
    lat: String(item.lat ?? ""),
    speed: String(item.speed ?? ""),
    version: item.version ?? "",
    navstatus: String(item.navstatus ?? ""),
    online: String(item.online ?? ""),
    remarks: item.remarks ?? "",
    create_time: item.create_time ?? ""
  });

  const fetchDeviceList = async () => {
    loading.value = true;
    try {
      const res = await getDeviceListQuery();
      const list = Array.isArray(res.data) ? res.data : [];
      tableData.value = list.map(normalizeDevice);
    } catch (err) {
      console.error("[shipForm] 获取设备列表失败:", err);
      tableData.value = [];
    } finally {
      loading.value = false;
    }
  };

  // ===== 收藏 =====
  const favorites = ref<string[]>(
    JSON.parse(localStorage.getItem("deviceFavorites") || "[]")
  );

  const isFavorite = (devid: string) => favorites.value.includes(devid);

  const toggleFavorite = (row: DeviceRecord) => {
    const idx = favorites.value.indexOf(row.devid);
    if (idx >= 0) {
      favorites.value.splice(idx, 1);
      ElMessage.success(`已取消关注 ${row.shipname_cn}`);
    } else {
      favorites.value.push(row.devid);
      ElMessage.success(`已关注 ${row.shipname_cn}`);
    }
    localStorage.setItem("deviceFavorites", JSON.stringify(favorites.value));
  };

  // ===== 搜索（UI 输入值 / 点击搜索后生效的过滤值） =====
  const searchFormRef = ref();
  const searchParams = reactive<SearchParams>(emptySearchParams());
  const appliedSearchParams = reactive<SearchParams>(emptySearchParams());

  const pagination = reactive({
    currentPage: 1,
    pageSize: 20,
    total: 0,
    background: true
  });

  const saveSearchConditions = () => {
    localStorage.setItem(
      SEARCH_STORAGE_KEY,
      JSON.stringify({ ...searchParams })
    );
  };

  const restoreLastSearch = (silent = true) => {
    const raw = localStorage.getItem(SEARCH_STORAGE_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as Partial<SearchParams>;
      Object.assign(searchParams, emptySearchParams(), saved);
      Object.assign(appliedSearchParams, emptySearchParams(), saved);
      pagination.currentPage = 1;
    } catch (err) {
      console.error("[shipForm] 恢复搜索条件失败:", err);
      if (!silent) ElMessage.error("恢复搜索条件失败");
    }
  };

  const applyLocalSearch = () => {
    Object.assign(appliedSearchParams, {
      keyword: searchParams.keyword,
      type: searchParams.type,
      navstatus: searchParams.navstatus,
      onlineStatus: searchParams.onlineStatus
    });
    pagination.currentPage = 1;
  };

  /** 「仅显示关注」勾选即生效，不走搜索按钮 */
  const onFavoriteFilterChange = () => {
    pagination.currentPage = 1;
    saveSearchConditions();
  };

  const onSearch = () => {
    applyLocalSearch();
    saveSearchConditions();
    ElMessage.success(`搜索完成，共找到 ${filteredList.value.length} 条记 录`);
  };

  const resetSearch = () => {
    searchFormRef.value?.resetFields();
    Object.assign(searchParams, emptySearchParams());
    Object.assign(appliedSearchParams, emptySearchParams());
    pagination.currentPage = 1;
    localStorage.removeItem(SEARCH_STORAGE_KEY);
    ElMessage.success("已恢复初始条件");
  };

  const refreshList = async () => {
    await fetchDeviceList();
  };

  // ===== 本地过滤 + 分页 =====
  const filteredList = computed(() => {
    let list = [...tableData.value];
    if (searchParams.showFavoriteOnly) {
      list = list.filter(d => favorites.value.includes(d.devid));
    }
    if (appliedSearchParams.type) {
      list = list.filter(d => d.type === appliedSearchParams.type);
    }
    if (appliedSearchParams.navstatus) {
      list = list.filter(d => d.navstatus === appliedSearchParams.navstatus);
    }
    if (appliedSearchParams.onlineStatus) {
      list = list.filter(
        d => getOnlineStatus(d) === appliedSearchParams.onlineStatus
      );
    }
    if (appliedSearchParams.keyword.trim()) {
      const q = appliedSearchParams.keyword.trim().toLowerCase();
      const toSafeLower = (value: unknown) => String(value ?? "").toLowerCase();
      list = list.filter(
        d =>
          toSafeLower(d.devid).includes(q) ||
          toSafeLower(d.shipname_cn).includes(q) ||
          toSafeLower(d.shipname_en).includes(q) ||
          toSafeLower(GROUP_MAP[d.type]).includes(q) ||
          toSafeLower(d.version).includes(q)
      );
    }
    return list;
  });

  const dataList = computed(() => {
    pagination.total = filteredList.value.length;
    const start = (pagination.currentPage - 1) * pagination.pageSize;
    return filteredList.value.slice(start, start + pagination.pageSize);
  });

  onMounted(async () => {
    await fetchDeviceList();
    restoreLastSearch(true);
  });

  onActivated(() => {
    restoreLastSearch(true);
  });

  // ===== 多选 =====
  const multipleSelection = ref<DeviceRecord[]>([]);

  // ===== 列定义 =====
  const columns: TableColumnList = [
    { type: "selection", align: "center", width: 50 },
    { label: "关注", width: 60, align: "center", slot: "favorite" },
    { label: "设备编号", prop: "devid", sortable: true, minWidth: 120 },
    { label: "船名（中文）", prop: "shipname_cn", minWidth: 120 },
    { label: "船名（英文）", prop: "shipname_en", minWidth: 130 },
    {
      label: "所属分组",
      prop: "type",
      minWidth: 110,
      sortable: true,
      slot: "group"
    },
    { label: "MMSI", prop: "mmsi", minWidth: 100 },
    { label: "经度", prop: "lng", minWidth: 100 },
    { label: "纬度", prop: "lat", minWidth: 100 },
    { label: "航速（kn）", prop: "speed", minWidth: 100 },
    { label: "版本号", prop: "version", sortable: true, minWidth: 100 },
    {
      label: "航行状态",
      prop: "navstatus",
      minWidth: 110,
      slot: "navstatus"
    },
    { label: "在线状态", minWidth: 100, slot: "onlineStatus" },
    {
      label: "备注",
      prop: "remarks",
      minWidth: 150,
      showOverflowTooltip: true
    },
    {
      label: "更新时间",
      prop: "create_time",
      sortable: true,
      minWidth: 160
    },
    { label: "操作", fixed: "right", minWidth: 240, slot: "operation" }
  ];

  // ===== CRUD =====
  const dialogVisible = ref(false);
  const dialogType = ref<"add" | "edit">("add");
  const currentRow = ref<DeviceRecord | null>(null);

  const openAdd = () => {
    dialogType.value = "add";
    currentRow.value = null;
    dialogVisible.value = true;
  };

  const openEdit = (row: DeviceRecord) => {
    dialogType.value = "edit";
    currentRow.value = { ...row };
    dialogVisible.value = true;
  };

  /** 跳转系统状态页并选中当前船舶 */
  const goToParamConfig = (row: DeviceRecord) => {
    boatStore.setSelectedBoatId(row.devid);
    router.push({
      name: "ParamSystemState",
      query: { devid: row.devid }
    });
  };

  const toSavePayload = (
    data: DeviceRecord,
    isEdit = false
  ): DeviceSaveDTO => ({
    devid: data.devid,
    shipname_cn: data.shipname_cn,
    shipname_en: data.shipname_en,
    type: data.type,
    mmsi: data.mmsi.trim(),
    lng: data.lng || "0.000000",
    lat: data.lat || "0.000000",
    speed: data.speed || "0.00",
    version: data.version || "",
    navstatus: data.navstatus || "0",
    online: data.online || "0",
    create_time:
      isEdit && data.create_time
        ? data.create_time
        : new Date().toISOString().replace("T", " ").substring(0, 19)
  });

  const handleSubmit = async (data: DeviceRecord) => {
    const isEdit = dialogType.value === "edit";
    const res = isEdit
      ? await updateDeviceList(toSavePayload(data, true))
      : await addDeviceList(toSavePayload(data));
    ElMessage.success(res.msg || (isEdit ? "更新成功" : "添加成功"));
    dialogVisible.value = false;
    await fetchDeviceList();
  };

  const handleDelete = (row: DeviceRecord) => {
    ElMessageBox.confirm(`确认删除设备 "${row.devid}"？`, "警告", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning"
    })
      .then(async () => {
        const res = await deleteDeviceList(row.devid);
        ElMessage.success(res.msg || "删除成功");
        await fetchDeviceList();
      })
      .catch(() => {});
  };

  // ===== 导出 =====
  const handleExport = () => {
    const data = multipleSelection.value.length
      ? multipleSelection.value
      : dataList.value;
    if (!data.length) {
      ElMessage.warning("暂无数据可导出");
      return;
    }
    const rows = data.map(d => ({
      设备编号: d.devid,
      "船名（中文）": d.shipname_cn,
      "船名（英文）": d.shipname_en,
      所属分组: GROUP_MAP[d.type] || "",
      MMSI: d.mmsi,
      经度: d.lng,
      纬度: d.lat,
      "航速（kn）": d.speed,
      版本号: d.version,
      航行状态: NAV_STATUS_MAP[d.navstatus] || "",
      在线状态: getOnlineStatus(d),
      备注: d.remarks,
      更新时间: d.create_time
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "设备列表");
    const ts = new Date()
      .toISOString()
      .replaceAll("-", "")
      .replaceAll(":", "")
      .replace("T", "")
      .substring(0, 14);
    XLSX.writeFile(wb, `设备列表_${ts}.xlsx`);
    ElMessage.success("导出成功");
  };

  // ===== 关注图标渲染 =====
  const favoriteIcon = (devid: string) =>
    useRenderIcon(isFavorite(devid) ? StarFilled : Star);

  return {
    tableData,
    favorites,
    isFavorite,
    toggleFavorite,
    favoriteIcon,
    searchFormRef,
    loading,
    searchParams,
    pagination,
    onSearch,
    onFavoriteFilterChange,
    resetSearch,
    refreshList,
    dataList,
    multipleSelection,
    columns,
    dialogVisible,
    dialogType,
    currentRow,
    openAdd,
    openEdit,
    goToParamConfig,
    handleSubmit,
    handleDelete,
    handleExport
  };
}
