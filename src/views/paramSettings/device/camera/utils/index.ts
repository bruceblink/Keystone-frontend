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
import type { CameraForm, CameraItem, ComboxRawItem } from "./types";
import {
  addDevice,
  deleteAlarmCondition,
  deleteDevices,
  getAlarmConditionQuery,
  getDeviceListQuery,
  updateDevice,
  type DeviceListItemDTO,
  type DeviceSaveDTO
} from "@/api/paramSettings/device";
import { getComboxDictQuery } from "@/api/paramSettings/combox";
import {
  BRAND_MAP,
  CAMERA_TYPE,
  byteLength,
  createEmptyCameraForm,
  formatDateTime,
  genId,
  getBrandText,
  getComboxLabel,
  getComboxOptions,
  getInferenceText,
  getStatusTagType,
  getStatusText,
  getUniqueUuid,
  isValidCamid,
  isValidIp,
  matchComboxSort,
  normalizeText,
  parseTimeValue
} from "./dict";
import {
  isExcelFile,
  logImportFailures,
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
 * 将接口设备 DTO 规范为页面使用的摄像机项
 */
const normalizeCamera = (item: DeviceListItemDTO): CameraItem => ({
  _id: String(item._id ?? genId()),
  camid: item.camid ?? "",
  devname: item.devname ?? "",
  ipaddr: item.ipaddr ?? "",
  user: item.user ?? "",
  passwd: item.passwd ?? "",
  url: item.url ?? "",
  brand: String(item.brand ?? ""),
  type: String(item.type ?? CAMERA_TYPE),
  status: String(item.status ?? ""),
  areaid: String(item.areaid ?? ""),
  areacode: String(item.areacode ?? ""),
  sub_stream: item.sub_stream ?? "",
  inference: String(item.inference ?? ""),
  create_time: item.create_time ?? "",
  devid: item.devid ?? ""
});

/**
 * 将表单数据组装为设备保存接口 payload
 */
const toSavePayload = (
  form: CameraForm,
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
  type: form.type || CAMERA_TYPE,
  status: form.status,
  areaid: form.areaid,
  areacode: form.areacode,
  sub_stream: form.sub_stream,
  inference: form.inference,
  create_time: options?.create_time ?? form.create_time ?? "",
  devid
});

/** 导入跳过记录：行号 + 原因 */
type ImportSkip = { row: number; reason: string };

type ImportRowSuccess = { ok: true; data: DeviceSaveDTO };
type ImportRowFailure = { ok: false; skip: ImportSkip };
type ImportRowResult = ImportRowSuccess | ImportRowFailure;

/**
 * 摄像机列表页组合式逻辑：数据拉取、表格、增删改查、导入导出
 * @param boatId 当前选中船只 devid
 */
export function useCameraList(boatId: Ref<string>) {
  const allDevices = ref<CameraItem[]>([]);
  const tableData = ref<CameraItem[]>([]);
  const dropdownData = ref<ComboxRawItem[]>([]);
  const alarmList = ref<{ _id: string; camid: string }[]>([]);
  const loading = ref(false);
  const searchQuery = ref("");
  const multipleSelection = ref<CameraItem[]>([]);
  const drawerVisible = ref(false);
  const isEdit = ref(false);
  const editForm = reactive<CameraForm>(createEmptyCameraForm());

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
   * 拉取指定船只的设备列表，并筛选出摄像机类型
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
      allDevices.value = list.map(normalizeCamera);
      tableData.value = allDevices.value.filter(
        item => item.type === CAMERA_TYPE
      );
      pagination.currentPage = 1;
    } catch (err) {
      console.error("[camera] 查询设备列表失败:", err);
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
      console.error("[camera] 获取区域下拉数据失败:", err);
      dropdownData.value = [];
    }
  };

  /**
   * 拉取报警参数列表，用于删除摄像机时联动删除关联报警
   */
  const fetchAlarmList = async (devid?: string) => {
    const id = devid ?? boatId.value;
    if (!id) {
      alarmList.value = [];
      return;
    }
    try {
      const res = await getAlarmConditionQuery(id);
      const list = Array.isArray(res.data) ? res.data : [];
      alarmList.value = list.map(item => ({
        _id: String(item._id ?? ""),
        camid: String(item.camid ?? "")
      }));
    } catch (err) {
      console.error("[camera] 获取报警参数失败:", err);
      alarmList.value = [];
    }
  };

  /**
   * 并行刷新设备列表、下拉字典、报警列表
   */
  const refreshAll = async (devid?: string) => {
    const id = devid ?? boatId.value;
    if (!id) return;
    await Promise.all([
      fetchDeviceList(id),
      fetchDropdownData(id),
      fetchAlarmList(id)
    ]);
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
          alarmList.value = [];
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
    { label: "区域类型", prop: "areacode", minWidth: 120, slot: "areacode" },
    { label: "区域编号", prop: "areaid", minWidth: 120, slot: "areaid" },
    { label: "设备品牌", prop: "brand", width: 110, slot: "brand" },
    { label: "IP", prop: "ipaddr", minWidth: 130, showOverflowTooltip: true },
    {
      label: "辅码流",
      prop: "sub_stream",
      width: 100,
      showOverflowTooltip: true
    },
    { label: "是否推理", prop: "inference", width: 100, slot: "inference" },
    {
      label: "访问地址",
      prop: "url",
      minWidth: 180,
      showOverflowTooltip: true
    },
    { label: "在线状态", prop: "status", width: 100, slot: "status" },
    { label: "更新时间", prop: "create_time", width: 170 },
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
   * 校验设备编号是否已被其他摄像机占用
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
    Object.assign(editForm, createEmptyCameraForm());
    drawerVisible.value = true;
  };

  /** 打开编辑抽屉并回填行数据 */
  const handleEdit = (row: CameraItem) => {
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
      sub_stream: row.sub_stream,
      inference: row.inference,
      create_time: row.create_time
    });
    drawerVisible.value = true;
  };

  /**
   * 提交新增/编辑表单：校验后调用保存接口并刷新列表
   */
  const submitForm = async (form: CameraForm) => {
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
      ElMessage.error(`摄像机编号 ${form.camid} 已存在`);
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
      console.error("[camera] 保存设备失败:", err);
    }
  };

  /**
   * 按 camid 删除关联的报警参数记录
   */
  const deleteRelatedAlarms = async (camids: string[]) => {
    const targets = alarmList.value.filter(item => camids.includes(item.camid));
    if (!targets.length) return;
    let success = 0;
    for (const alarm of targets) {
      try {
        await deleteAlarmCondition(alarm._id);
        success++;
      } catch {
        // ignore single failure
      }
    }
    if (success > 0) {
      ElMessage.success(`成功删除 ${success} 条关联报警参数`);
    }
  };

  /**
   * 批量删除选中摄像机及其关联报警参数
   */
  const handleBatchDelete = () => {
    if (!multipleSelection.value.length) {
      ElMessage.warning("请选择要删除的摄像机");
      return;
    }
    ElMessageBox.confirm(
      `是否删除选中的 ${multipleSelection.value.length} 个摄像机和对应的报警参数？`,
      "警告",
      { confirmButtonText: "确定", cancelButtonText: "取消", type: "warning" }
    )
      .then(async () => {
        const selectedIds = multipleSelection.value.map(item => item._id);
        const selectedCamIds = multipleSelection.value.map(item => item.camid);
        try {
          await deleteRelatedAlarms(selectedCamIds);
          await deleteDevices(selectedIds);
          ElMessage.success("删除设备成功");
          multipleSelection.value = [];
          await refreshAll(boatId.value);
        } catch (err) {
          console.error("[camera] 删除设备失败:", err);
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

  /**
   * 将选中行导出为 Excel
   */
  const handleExport = () => {
    const rows = requireSelectionForExport(multipleSelection.value);
    if (!rows) return;
    const exportData = rows.map(camera => ({
      设备编号: camera.camid,
      设备名称: camera.devname,
      IP地址: camera.ipaddr,
      用户名: camera.user,
      密码: camera.passwd,
      设备品牌: camera.brand,
      访问地址: camera.url,
      在线状态: camera.status,
      区域编号: camera.areaid,
      区域类型: camera.areacode,
      辅码流: camera.sub_stream,
      是否推理: camera.inference
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
      { wch: 15 },
      { wch: 12 }
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Cameras");
    XLSX.writeFile(wb, `摄像机列表_${new Date().toLocaleDateString()}.xlsx`);
    ElMessage.success("导出成功");
  };

  /**
   * 校验 Excel 单行导入数据，通过则返回可保存的 DTO
   */
  const validateImportRow = (
    row: Record<string, string>,
    rowNum: number,
    areaIdList: ComboxRawItem[],
    areaCodeList: ComboxRawItem[],
    existing: {
      camids: Set<string>;
      devnames: Set<string>;
      ipaddrs: Set<string>;
      urls: Set<string>;
    }
  ): ImportRowResult => {
    const camid = normalizeText(row["设备编号"]);
    const devname = normalizeText(row["设备名称"]);
    const ipaddr = normalizeText(row["IP地址"]);
    const url = normalizeText(row["访问地址"]);

    if (existing.camids.has(camid)) {
      return {
        ok: false,
        skip: { row: rowNum, reason: `设备编号「${camid}」已存在` }
      };
    }
    if (devname && existing.devnames.has(devname)) {
      return {
        ok: false,
        skip: { row: rowNum, reason: `设备名称「${devname}」已存在` }
      };
    }
    if (ipaddr && existing.ipaddrs.has(ipaddr)) {
      return {
        ok: false,
        skip: { row: rowNum, reason: `IP地址「${ipaddr}」已存在` }
      };
    }
    if (url && existing.urls.has(url)) {
      return {
        ok: false,
        skip: { row: rowNum, reason: `访问地址「${url}」已存在` }
      };
    }

    const missing: string[] = [];
    if (!camid) missing.push("设备编号");
    if (!devname) missing.push("设备名称");
    if (!url) missing.push("访问地址");
    if (row["区域编号"] === undefined || row["区域编号"] === "")
      missing.push("区域编号");
    if (row["区域类型"] === undefined || row["区域类型"] === "")
      missing.push("区域类型");
    if (row["在线状态"] === undefined || row["在线状态"] === "")
      missing.push("在线状态");
    if (row["设备品牌"] === undefined || row["设备品牌"] === "")
      missing.push("设备品牌");
    if (missing.length) {
      return {
        ok: false,
        skip: { row: rowNum, reason: `${missing.join("、")} 为必填项` }
      };
    }

    if (!isValidCamid(camid)) {
      return {
        ok: false,
        skip: { row: rowNum, reason: "设备编号只能包含字母、数字和下划线" }
      };
    }
    if (byteLength(camid) > 64 || byteLength(devname) > 64) {
      return {
        ok: false,
        skip: { row: rowNum, reason: "设备编号或设备名称长度超过64字节" }
      };
    }
    if (ipaddr && !isValidIp(ipaddr)) {
      return { ok: false, skip: { row: rowNum, reason: "IP地址格式不正确" } };
    }
    if (/[\u4e00-\u9fa5]/.test(url)) {
      return {
        ok: false,
        skip: { row: rowNum, reason: "访问地址不能包含中文" }
      };
    }

    const areaIdRaw = normalizeText(row["区域编号"]);
    const areaCodeRaw = normalizeText(row["区域类型"]);
    const areaid = matchComboxSort(areaIdList, COMBOX_AREA_ID, areaIdRaw);
    const areacode = matchComboxSort(
      areaCodeList,
      COMBOX_AREA_CODE,
      areaCodeRaw
    );
    if (!areaid) {
      return {
        ok: false,
        skip: { row: rowNum, reason: `区域编号「${areaIdRaw}」不存在于系统中` }
      };
    }
    if (!areacode) {
      return {
        ok: false,
        skip: {
          row: rowNum,
          reason: `区域类型「${areaCodeRaw}」不存在于系统中`
        }
      };
    }

    const idSet = new Set(allDevices.value.map(d => d._id));
    return {
      ok: true,
      data: {
        camid,
        devname,
        ipaddr,
        user: normalizeText(row["用户名"]),
        passwd: normalizeText(row["密码"]),
        url,
        brand: normalizeText(row["设备品牌"]),
        type: CAMERA_TYPE,
        status: normalizeText(row["在线状态"]),
        areaid,
        areacode,
        sub_stream: normalizeText(row["辅码流"]),
        inference: normalizeText(row["是否推理"]),
        create_time: formatDateTime(new Date()),
        devid: boatId.value,
        _id: getUniqueUuid(idSet)
      }
    };
  };

  /**
   * 解析 Excel 并批量新增摄像机，记录跳过行与接口失败数
   */
  const importCamerasFromFile = async (file: File) => {
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

    const { areaIdList, areaCodeList } = await fetchAreaComboxLists(
      boatId.value
    );

    const existing = {
      camids: new Set(tableData.value.map(item => item.camid)),
      devnames: new Set(tableData.value.map(item => item.devname)),
      ipaddrs: new Set(
        tableData.value.map(item => item.ipaddr).filter(Boolean)
      ),
      urls: new Set(tableData.value.map(item => item.url))
    };
    const seenInFile = {
      camids: new Set<string>(),
      devnames: new Set<string>(),
      ipaddrs: new Set<string>(),
      urls: new Set<string>()
    };

    const toImport: DeviceSaveDTO[] = [];
    const skipLogs: ImportSkip[] = [];

    for (let index = 0; index < jsonData.length; index++) {
      const row = jsonData[index];
      const rowNum = index + 2;
      const camid = normalizeText(row["设备编号"]);
      const devname = normalizeText(row["设备名称"]);
      const ipaddr = normalizeText(row["IP地址"]);
      const url = normalizeText(row["访问地址"]);

      const duplicateInFile =
        (camid && seenInFile.camids.has(camid)) ||
        (devname && seenInFile.devnames.has(devname)) ||
        (ipaddr && seenInFile.ipaddrs.has(ipaddr)) ||
        (url && seenInFile.urls.has(url));
      if (duplicateInFile) {
        skipLogs.push({ row: rowNum, reason: "文件内存在重复字段" });
        continue;
      }
      if (camid) seenInFile.camids.add(camid);
      if (devname) seenInFile.devnames.add(devname);
      if (ipaddr) seenInFile.ipaddrs.add(ipaddr);
      if (url) seenInFile.urls.add(url);

      const result = validateImportRow(
        row,
        rowNum,
        areaIdList,
        areaCodeList,
        existing
      );
      if (result.ok === false) {
        skipLogs.push(result.skip);
        continue;
      }
      toImport.push(result.data);
      existing.camids.add(result.data.camid);
      if (result.data.devname) existing.devnames.add(result.data.devname);
      if (result.data.ipaddr) existing.ipaddrs.add(result.data.ipaddr);
      existing.urls.add(result.data.url);
    }

    if (!toImport.length) {
      logImportFailures("camera", skipLogs);
      ElMessage.warning("未导入任何数据，请检查文件内容");
      return;
    }

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
      logImportFailures("camera", skipLogs);
      showImportResult(added, skipLogs.length, apiFailed);
    } finally {
      loading.value = false;
    }
  };

  /**
   * 触发文件选择并执行 Excel 导入
   */
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
      importCamerasFromFile(file).catch(err => {
        console.error("[camera] 导入失败:", err);
        ElMessage.error("读取文件失败");
      });
    };
    input.click();
  };

  /**
   * 用列表最新一条记录填充表单（模板导入），camid 留空供用户填写
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
      sub_stream: latest.sub_stream,
      inference: latest.inference,
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
    tableData,
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
    getInferenceText,
    getStatusText,
    getStatusTagType
  };
}
