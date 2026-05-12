import { ref, computed, reactive } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import * as XLSX from "xlsx";
import type { DeviceRecord, SearchParams } from "./types";
import {
  GROUP_MAP,
  NAV_STATUS_MAP,
  MOCK_DEVICES,
  getOnlineStatus
} from "./dict";

import StarFilled from "@iconify-icons/ep/star-filled";
import Star from "@iconify-icons/ep/star";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

export function useBoatDeviceHook() {
  // ===== 数据源 =====
  const tableData = ref<DeviceRecord[]>(MOCK_DEVICES.map(d => ({ ...d })));

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

  // ===== 搜索 =====
  const searchFormRef = ref();
  const searchParams = reactive<SearchParams>({
    keyword: "",
    type: "",
    navstatus: "",
    onlineStatus: "",
    showFavoriteOnly: false
  });

  const pagination = reactive({
    currentPage: 1,
    pageSize: 20,
    total: 0,
    background: true
  });

  const onSearch = () => {
    pagination.currentPage = 1;
  };

  const resetSearch = () => {
    searchFormRef.value?.resetFields();
    Object.assign(searchParams, {
      keyword: "",
      type: "",
      navstatus: "",
      onlineStatus: "",
      showFavoriteOnly: false
    });
    pagination.currentPage = 1;
  };

  // ===== 过滤 + 分页 =====
  const filteredList = computed(() => {
    let list = [...tableData.value];
    if (searchParams.showFavoriteOnly) {
      list = list.filter(d => favorites.value.includes(d.devid));
    }
    if (searchParams.type) {
      list = list.filter(d => d.type === searchParams.type);
    }
    if (searchParams.navstatus) {
      list = list.filter(d => d.navstatus === searchParams.navstatus);
    }
    if (searchParams.onlineStatus) {
      list = list.filter(d => getOnlineStatus(d) === searchParams.onlineStatus);
    }
    if (searchParams.keyword.trim()) {
      const q = searchParams.keyword.trim().toLowerCase();
      list = list.filter(
        d =>
          d.devid.toLowerCase().includes(q) ||
          d.shipname_cn.toLowerCase().includes(q) ||
          d.shipname_en.toLowerCase().includes(q) ||
          d.version.toLowerCase().includes(q)
      );
    }
    return list;
  });

  const dataList = computed(() => {
    pagination.total = filteredList.value.length;
    const start = (pagination.currentPage - 1) * pagination.pageSize;
    return filteredList.value.slice(start, start + pagination.pageSize);
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
    { label: "操作", fixed: "right", minWidth: 160, slot: "operation" }
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

  const handleSubmit = (data: DeviceRecord) => {
    if (dialogType.value === "add") {
      tableData.value.unshift({
        ...data,
        create_time: new Date().toISOString().replace("T", " ").substring(0, 19)
      });
      ElMessage.success("添加成功");
    } else {
      const idx = tableData.value.findIndex(d => d.devid === data.devid);
      if (idx >= 0) tableData.value[idx] = { ...data };
      ElMessage.success("更新成功");
    }
  };

  const handleDelete = (row: DeviceRecord) => {
    ElMessageBox.confirm(`确认删除设备 "${row.devid}"？`, "警告", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning"
    })
      .then(() => {
        tableData.value = tableData.value.filter(d => d.devid !== row.devid);
        ElMessage.success("删除成功");
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
    const ts = new Date().toISOString().replace(/[-:T]/g, "").substring(0, 14);
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
    searchParams,
    pagination,
    onSearch,
    resetSearch,
    dataList,
    multipleSelection,
    columns,
    dialogVisible,
    dialogType,
    currentRow,
    openAdd,
    openEdit,
    handleSubmit,
    handleDelete,
    handleExport
  };
}
