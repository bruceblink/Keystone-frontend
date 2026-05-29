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
import type { LaserForm, LaserItem, ComboxRawItem } from "./types";
import {
  addDevice,
  deleteDevices,
  getDeviceListQuery,
  updateDevice,
  type DeviceListItemDTO,
  type DeviceSaveDTO
} from "@/api/paramSettings/device";
import { getComboxDictQuery } from "@/api/paramSettings/combox";
import {
  BRAND_MAP,
  LASER_TYPE,
  byteLength,
  createEmptyLaserForm,
  formatDateTime,
  genId,
  getBrandText,
  getComboxLabel,
  getComboxOptions,
  getStatusTagType,
  getStatusText,
  getUniqueUuid,
  isValidCamid,
  isValidIp,
  normalizeText,
  parseTimeValue
} from "./dict";
import {
  isExcelFile,
  readExcelJsonRows,
  requireSelectionForExport,
  showImportResult
} from "../../../importExport";

/** combox 字典名：区域编号 */
const COMBOX_AREA_ID = "区域编号";
/** combox 字典名：区域类型 */
const COMBOX_AREA_CODE = "区域类型";

/**
 * 为 combox 接口返回项补全 name 分组字段，便于按组筛选
 */
const tagComboxGroup = (list: unknown, groupName: string): ComboxRawItem[] =>
  (Array.isArray(list) ? list : []).map(row => {
    const item = row as ComboxRawItem;
    return { ...item, name: item.name ?? groupName };
  });

/**
 * 并行请求区域编号、区域类型下拉字典
 */
const fetchAreaComboxLists = async (devid: string) => {
  const [areaIdRes, areaCodeRes] = await Promise.all([
    getComboxDictQuery({ name: COMBOX_AREA_ID, devid }),
    getComboxDictQuery({ name: COMBOX_AREA_CODE, devid })
  ]);
  return {
    areaIdList: tagComboxGroup(areaIdRes.data, COMBOX_AREA_ID),
    areaCodeList: tagComboxGroup(areaCodeRes.data, COMBOX_AREA_CODE)
  };
};

/**
 * 将接口设备 DTO 规范为页面使用的激光设备项
 */
const normalizeLaser = (item: DeviceListItemDTO): LaserItem => ({
  _id: String(item._id ?? genId()),
  camid: item.camid ?? "",
  devname: item.devname ?? "",
  ipaddr: item.ipaddr ?? "",
  user: item.user ?? "",
  passwd: item.passwd ?? "",
  url: item.url ?? "",
  brand: String(item.brand ?? ""),
  type: String(item.type ?? LASER_TYPE),
  status: String(item.status ?? "3"),
  areaid: String(item.areaid ?? ""),
  areacode: String(item.areacode ?? ""),
  create_time: item.create_time ?? "",
  devid: item.devid ?? ""
});

/**
 * 将表单数据组装为设备保存接口 payload
 */
const toSavePayload = (
  form: LaserForm,
  devid: string,
  options?: { _id?: string; create_time?: string }
): DeviceSaveDTO => ({
  _id: options?._id ?? form._id,
  camid: form.camid,
  devname: form.devname,
  ipaddr: form.ipaddr,
  user: form.user,
  passwd: form.passwd,
  url: form.url,
  brand: form.brand,
  type: form.type || LASER_TYPE,
  status: form.status,
  areaid: form.areaid,
  areacode: form.areacode,
  create_time: options?.create_time ?? form.create_time ?? "",
  devid
});

/**
 * 将 Excel 导入行映射为设备保存 DTO（不做字段校验）
 */
const mapImportRowToPayload = (
  row: Record<string, string>,
  devid: string,
  idSet: Set<string>
): DeviceSaveDTO => ({
  camid: normalizeText(row["设备编号"]),
  devname: normalizeText(row["设备名称"]),
  ipaddr: normalizeText(row["IP地址"]),
  user: normalizeText(row["用户名"]),
  passwd: normalizeText(row["密码"]),
  url: normalizeText(row["访问地址"]),
  brand: normalizeText(row["设备品牌"]),
  type: LASER_TYPE,
  status: normalizeText(row["在线状态"]),
  areaid: normalizeText(row["区域编号"]),
  areacode: normalizeText(row["区域类型"]),
  create_time: formatDateTime(new Date()),
  devid,
  _id: getUniqueUuid(idSet)
});

/**
 * 激光设备列表页组合式逻辑：数据拉取、表格、增删改查、导入导出
 * @param boatId 当前选中船只 devid
 */
export function useLaserList(boatId: Ref<string>) {
  const allDevices = ref<LaserItem[]>([]);
  const tableData = ref<LaserItem[]>([]);
  const dropdownData = ref<ComboxRawItem[]>([]);
  const loading = ref(false);
  const searchQuery = ref("");
  const multipleSelection = ref<LaserItem[]>([]);
  const drawerVisible = ref(false);
  const isEdit = ref(false);
  const editForm = reactive<LaserForm>(createEmptyLaserForm());

  /** 区域编号下拉选项 */
  const areaIdOptions = computed(() =>
    getComboxOptions(dropdownData.value, COMBOX_AREA_ID)
  );
  /** 区域类型下拉选项 */
  const areaCodeOptions = computed(() =>
    getComboxOptions(dropdownData.value, COMBOX_AREA_CODE)
  );
  /** 设备品牌下拉选项（本地字典） */
  const brandOptions = computed(() =>
    Object.entries(BRAND_MAP).map(([value, label]) => ({ value, label }))
  );

  /**
   * 拉取指定船只的设备列表，并筛选出激光设备类型
   */
  const fetchDeviceList = async (devid?: string) => {
    const id = devid ?? boatId.value;
    if (!id) {
      allDevices.value = [];
      tableData.value = [];
      return;
    }
    loading.value = true;
    try {
      const res = await getDeviceListQuery(id);
      const list = Array.isArray(res.data) ? res.data : [];
      allDevices.value = list.map(normalizeLaser);
      tableData.value = allDevices.value.filter(
        item => item.type === LASER_TYPE
      );
      pagination.currentPage = 1;
    } catch (err) {
      console.error("[laser] 查询设备列表失败:", err);
      allDevices.value = [];
      tableData.value = [];
    } finally {
      loading.value = false;
    }
  };

  /**
   * 拉取区域编号、区域类型 combox 字典，供下拉与表格展示
   */
  const fetchDropdownData = async (devid?: string) => {
    const id = devid ?? boatId.value;
    if (!id) {
      dropdownData.value = [];
      return;
    }
    try {
      const { areaIdList, areaCodeList } = await fetchAreaComboxLists(id);
      dropdownData.value = [...areaIdList, ...areaCodeList];
    } catch (err) {
      console.error("[laser] 获取区域下拉数据失败:", err);
      dropdownData.value = [];
    }
  };

  /**
   * 并行刷新设备列表与区域下拉字典
   */
  const refreshAll = async (devid?: string) => {
    const id = devid ?? boatId.value;
    if (!id) return;
    await Promise.all([fetchDeviceList(id), fetchDropdownData(id)]);
  };

  let stopBoatWatch: (() => void) | null = null;

  /**
   * 监听船只切换：有选中则刷新数据，无选中则清空列表
   */
  function startBoatWatch() {
    stopBoatWatch?.();
    stopBoatWatch = watch(
      boatId,
      id => {
        if (id) refreshAll(id);
        else {
          allDevices.value = [];
          tableData.value = [];
          dropdownData.value = [];
          pagination.currentPage = 1;
        }
      },
      { immediate: false }
    );
  }

  onMounted(() => {
    startBoatWatch();
    if (boatId.value) refreshAll(boatId.value);
  });
  onBeforeUnmount(() => {
    stopBoatWatch?.();
    stopBoatWatch = null;
  });
  onActivated(() => {
    startBoatWatch();
    if (boatId.value) refreshAll(boatId.value);
  });
  onDeactivated(() => {
    stopBoatWatch?.();
    stopBoatWatch = null;
  });

  /** 按关键字过滤并按创建时间倒序 */
  const filteredData = computed(() => {
    let list = [...tableData.value];
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase();
      list = list.filter(
        item =>
          item.camid?.toLowerCase().includes(q) ||
          item.devname?.toLowerCase().includes(q)
      );
    }
    return list.sort(
      (a, b) => parseTimeValue(b.create_time) - parseTimeValue(a.create_time)
    );
  });

  /** 搜索时重置到第一页 */
  const onSearch = () => {
    pagination.currentPage = 1;
  };

  const pagination = reactive({
    currentPage: 1,
    pageSize: 15,
    total: 0,
    background: true
  });

  /** 当前页表格数据（前端分页切片） */
  const dataList = computed(() => {
    pagination.total = filteredData.value.length;
    const start = (pagination.currentPage - 1) * pagination.pageSize;
    return filteredData.value.slice(start, start + pagination.pageSize);
  });

  const columns: TableColumnList = [
    { type: "selection", width: 50, reserveSelection: true },
    {
      label: "设备编号",
      prop: "camid",
      minWidth: 140,
      showOverflowTooltip: true
    },
    {
      label: "设备名称",
      prop: "devname",
      minWidth: 150,
      showOverflowTooltip: true
    },
    { label: "设备品牌", prop: "brand", width: 110, slot: "brand" },
    { label: "区域类型", prop: "areacode", minWidth: 120, slot: "areacode" },
    { label: "区域编号", prop: "areaid", minWidth: 120, slot: "areaid" },
    { label: "IP", prop: "ipaddr", minWidth: 130, showOverflowTooltip: true },
    {
      label: "访问地址",
      prop: "url",
      minWidth: 180,
      showOverflowTooltip: true
    },
    { label: "更新时间", prop: "create_time", width: 170 },
    { label: "在线状态", prop: "status", width: 100, slot: "status" },
    { label: "操作", fixed: "right", width: 90, slot: "operation" }
  ];

  const formRules: FormRules = {
    camid: [{ required: true, message: "请输入设备编号", trigger: "blur" }],
    devname: [{ required: true, message: "请输入设备名称", trigger: "blur" }],
    url: [{ required: true, message: "请输入访问地址", trigger: "blur" }],
    areaid: [{ required: true, message: "请选择区域编号", trigger: "change" }],
    areacode: [
      { required: true, message: "请选择区域类型", trigger: "change" }
    ],
    brand: [{ required: true, message: "请选择设备品牌", trigger: "change" }]
  };

  /**
   * 校验设备编号是否已被其他激光设备占用
   */
  const checkCamidExist = (camid: string, currentCamid?: string) =>
    tableData.value.some(
      item => item.camid === camid && item.camid !== currentCamid
    );

  /** 打开新增抽屉并重置表单 */
  const handleAdd = () => {
    if (!boatId.value) {
      ElMessage.warning("请先选择船只");
      return;
    }
    isEdit.value = false;
    Object.assign(editForm, createEmptyLaserForm());
    drawerVisible.value = true;
  };

  /** 打开编辑抽屉并回填行数据 */
  const handleEdit = (row: LaserItem) => {
    isEdit.value = true;
    Object.assign(editForm, {
      _id: row._id,
      camid: row.camid,
      devname: row.devname,
      ipaddr: row.ipaddr,
      user: row.user,
      passwd: row.passwd,
      url: row.url,
      brand: row.brand,
      type: row.type,
      status: row.status,
      areaid: row.areaid,
      areacode: row.areacode,
      create_time: row.create_time
    });
    drawerVisible.value = true;
  };

  /**
   * 提交新增/编辑表单：校验后调用保存接口并刷新列表
   */
  const submitForm = async (form: LaserForm) => {
    if (!boatId.value) {
      ElMessage.warning("请先选择船只");
      return;
    }
    if (!isValidCamid(form.camid)) {
      ElMessage.error("设备编号只能包含字母、数字和下划线");
      return;
    }
    if (byteLength(form.camid) > 64 || byteLength(form.devname) > 64) {
      ElMessage.error("设备编号或设备名称长度超过64字节");
      return;
    }
    if (form.url && /[\u4e00-\u9fa5]/.test(form.url)) {
      ElMessage.error("访问地址不能包含中文");
      return;
    }
    if (form.ipaddr && !isValidIp(form.ipaddr)) {
      ElMessage.error("IP地址格式不正确");
      return;
    }
    if (!isEdit.value && checkCamidExist(form.camid)) {
      ElMessage.error(`设备编号 ${form.camid} 已存在`);
      return;
    }

    try {
      const payload = toSavePayload(form, boatId.value, {
        _id: form._id,
        create_time: isEdit.value
          ? form.create_time
          : formatDateTime(new Date())
      });
      if (isEdit.value) {
        await updateDevice(boatId.value, payload);
        ElMessage.success("修改成功");
      } else {
        await addDevice(boatId.value, {
          ...payload,
          _id: getUniqueUuid(new Set(allDevices.value.map(d => d._id)))
        });
        ElMessage.success("添加成功");
      }
      drawerVisible.value = false;
      await refreshAll(boatId.value);
    } catch (err) {
      console.error("[laser] 保存设备失败:", err);
    }
  };

  /** 批量删除选中的激光设备 */
  const handleBatchDelete = () => {
    if (!multipleSelection.value.length) {
      ElMessage.warning("请选择要删除的激光设备");
      return;
    }
    ElMessageBox.confirm(
      `确认删除选中的 ${multipleSelection.value.length} 个激光设备?`,
      "警告",
      { confirmButtonText: "确定", cancelButtonText: "取消", type: "warning" }
    )
      .then(async () => {
        const selectedIds = multipleSelection.value.map(item => item._id);
        try {
          await deleteDevices(selectedIds);
          ElMessage.success("删除成功");
          multipleSelection.value = [];
          await refreshAll(boatId.value);
        } catch (err) {
          console.error("[laser] 删除设备失败:", err);
        }
      })
      .catch(() => undefined);
  };

  /**
   * 清空搜索并重新拉取当前船只的全部数据
   */
  const handleRefresh = async () => {
    if (!boatId.value) {
      ElMessage.warning("请先选择船只");
      return;
    }
    searchQuery.value = "";
    await refreshAll(boatId.value);
    ElMessage.success("已刷新");
  };

  /** 将选中行导出为 Excel */
  const handleExport = () => {
    const rows = requireSelectionForExport(multipleSelection.value);
    if (!rows) return;
    const exportData = rows.map(device => ({
      设备编号: device.camid,
      设备名称: device.devname,
      IP地址: device.ipaddr,
      用户名: device.user,
      密码: device.passwd,
      设备品牌: device.brand,
      访问地址: device.url,
      在线状态: device.status,
      区域编号: device.areaid,
      区域类型: device.areacode,
      更新时间: device.create_time
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    ws["!cols"] = [
      { wch: 15 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 10 },
      { wch: 40 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 25 }
    ];
    XLSX.utils.book_append_sheet(wb, ws, "LaserDevices");
    XLSX.writeFile(wb, `激光设备列表_${new Date().toLocaleDateString()}.xlsx`);
    ElMessage.success("导出成功");
  };

  /**
   * 解析 Excel 并批量新增激光设备，由接口校验数据
   */
  const importLasersFromFile = async (file: File) => {
    if (!boatId.value) {
      ElMessage.warning("请先选择船只");
      return;
    }
    if (!isExcelFile(file)) {
      ElMessage.error("请选择 Excel 文件（.xlsx 或 .xls）");
      return;
    }

    await refreshAll(boatId.value);
    const jsonData = await readExcelJsonRows(file);
    if (!jsonData.length) {
      ElMessage.warning("文件中没有可导入的数据");
      return;
    }

    const idSet = new Set(allDevices.value.map(d => d._id));
    const toImport = jsonData.map(row =>
      mapImportRowToPayload(row, boatId.value, idSet)
    );

    loading.value = true;
    let added = 0;
    let apiFailed = 0;
    try {
      for (const payload of toImport) {
        try {
          await addDevice(boatId.value, payload);
          added++;
        } catch {
          apiFailed++;
        }
      }
      await refreshAll(boatId.value);
      showImportResult(added, 0, apiFailed);
    } finally {
      loading.value = false;
    }
  };

  /** 触发文件选择并执行 Excel 导入 */
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
      importLasersFromFile(file).catch(err => {
        console.error("[laser] 导入失败:", err);
        ElMessage.error("读取文件失败");
      });
    };
    input.click();
  };

  /**
   * 用列表最新一条记录填充表单（模板导入），设备编号留空供用户填写
   */
  const importTemplate = () => {
    if (!tableData.value.length) {
      ElMessage.warning("暂无可导入的数据");
      return;
    }
    const latest = [...tableData.value].sort(
      (a, b) => parseTimeValue(b.create_time) - parseTimeValue(a.create_time)
    )[0];
    if (!latest) return;
    Object.assign(editForm, {
      _id: undefined,
      camid: "",
      devname: latest.devname,
      ipaddr: latest.ipaddr,
      user: latest.user,
      passwd: latest.passwd,
      url: latest.url,
      brand: latest.brand,
      type: latest.type,
      status: latest.status,
      areaid: latest.areaid,
      areacode: latest.areacode,
      create_time: undefined
    });
    ElMessage.success("模板导入成功");
  };

  /** 区域类型 sort 转展示文案 */
  const getAreaCodeText = (code: string) =>
    getComboxLabel(dropdownData.value, COMBOX_AREA_CODE, code);
  /** 区域编号 sort 转展示文案 */
  const getAreaIdText = (id: string) =>
    getComboxLabel(dropdownData.value, COMBOX_AREA_ID, id);

  return {
    loading,
    searchQuery,
    dataList,
    pagination,
    onSearch,
    multipleSelection,
    columns,
    drawerVisible,
    isEdit,
    editForm,
    formRules,
    areaIdOptions,
    areaCodeOptions,
    brandOptions,
    handleAdd,
    handleEdit,
    submitForm,
    handleBatchDelete,
    handleRefresh,
    handleExport,
    handleImport,
    importTemplate,
    getAreaCodeText,
    getAreaIdText,
    getBrandText,
    getStatusText,
    getStatusTagType
  };
}
