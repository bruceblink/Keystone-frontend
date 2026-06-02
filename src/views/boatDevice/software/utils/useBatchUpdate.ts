import { ref, reactive, computed, watch, onMounted, nextTick } from "vue";
import type { TableInstance } from "element-plus";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  getDeviceVersionQuery,
  postVersionUpdateAdd,
  type DeviceVersionItemDTO
} from "@/api/boatDevice/software";
import { useBoatStoreHook } from "@/store/modules/boat";
import type { DeviceItem, SoftwareVersion } from "./types";

/** 批量更新弹窗：设备多选 + 软件版本选择 + 提交更新任务 */

const genUuid = () =>
  crypto.randomUUID
    ? crypto.randomUUID()
    : `upd-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

/** 生成与后端一致的本地时间字符串，作为 create_time */
const formatNow = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

/** 统一后端版本字段命名（url/fileUrl、path/client_path 等别名） */
const normalizeVersion = (item: DeviceVersionItemDTO): SoftwareVersion => ({
  uuid: String(item.uuid ?? ""),
  ver_name: String(item.ver_name ?? ""),
  version: String(item.version ?? ""),
  size: String(item.size ?? ""),
  create_time: String(item.create_time ?? ""),
  url: String(item.url ?? item.fileUrl ?? ""),
  path: String(item.path ?? item.client_path ?? "")
});

/**
 * @param onSubmitted 全部任务添加成功后的回调（通常关闭弹窗并刷新列表）
 */
export function useBatchUpdate(onSubmitted: () => void) {
  const boatStore = useBoatStoreHook();
  const versionsLoading = ref(false);

  /** 设备来源为全局船舶 store，列表页轮询刷新 store 时也会联动更新 */
  const allDevices = computed<DeviceItem[]>(() =>
    boatStore.allBoats.map(b => ({
      devid: b.devid,
      shipname_cn: b.shipname_cn,
      shipname_en: b.shipname_en,
      type: b.type
    }))
  );

  const deviceSearch = ref("");

  const filteredDevices = computed(() => {
    const kw = deviceSearch.value.trim().toLowerCase();
    if (!kw) return allDevices.value;
    return allDevices.value.filter(
      d =>
        d.devid?.toLowerCase().includes(kw) ||
        d.shipname_cn?.toLowerCase().includes(kw) ||
        d.shipname_en?.toLowerCase().includes(kw)
    );
  });

  /** 以 devid 为唯一键维护选中集，避免表格数据刷新/搜索过滤后勾选丢失 */
  const selectedDevIds = ref<Set<string>>(new Set());

  const selectedDevices = computed(() =>
    allDevices.value.filter(d => selectedDevIds.value.has(d.devid))
  );

  /** 程序恢复勾选时不回写，防止与 toggleRowSelection 互相触发 */
  let restoringSelection = false;

  /** 仅同步当前可见行的勾选变化，筛选隐藏的行仍保留在 selectedDevIds 中 */
  const handleSelectionChange = (rows: DeviceItem[]) => {
    if (restoringSelection) return;
    const visibleIds = new Set(filteredDevices.value.map(d => d.devid));
    const selectedInView = new Set(rows.map(r => r.devid));
    const next = new Set(selectedDevIds.value);
    visibleIds.forEach(id => {
      if (selectedInView.has(id)) next.add(id);
      else next.delete(id);
    });
    selectedDevIds.value = next;
  };

  const deviceTableRef = ref<{ getTableRef: () => TableInstance }>();

  /** 数据或筛选变化后，按 selectedDevIds 回显表格勾选状态 */
  const restoreTableSelection = async () => {
    if (!selectedDevIds.value.size) return;
    await nextTick();
    const table = deviceTableRef.value?.getTableRef();
    if (!table) return;
    restoringSelection = true;
    filteredDevices.value.forEach(row => {
      table.toggleRowSelection(row, selectedDevIds.value.has(row.devid));
    });
    restoringSelection = false;
  };

  // 版本加载中不重绘勾选，避免 loading 结束前的空选闪烁
  watch(
    [filteredDevices, versionsLoading, () => boatStore.allBoats.length],
    () => {
      if (versionsLoading.value) return;
      restoreTableSelection();
    }
  );

  const deviceColumns: TableColumnList = [
    { type: "selection", align: "center", width: 50, reserveSelection: true },
    { label: "设备编号", prop: "devid", minWidth: 110 },
    { label: "船名（中文）", prop: "shipname_cn", minWidth: 120 },
    { label: "船名（英文）", prop: "shipname_en", minWidth: 130 }
  ];

  const versionList = ref<SoftwareVersion[]>([]);

  const fetchVersionList = async () => {
    versionsLoading.value = true;
    try {
      const res = await getDeviceVersionQuery();
      versionList.value = (res.data ?? []).map(normalizeVersion);
    } catch (err) {
      console.error("[software] /device/version/query 失败:", err);
      ElMessage.error("版本列表加载失败");
      versionList.value = [];
    } finally {
      versionsLoading.value = false;
    }
  };

  const uniqueSoftwareList = computed(() =>
    [...new Set(versionList.value.map(v => v.ver_name))].filter(Boolean)
  );

  /** 语义化版本号比较，用于目标版本下拉排序（如 1.2.10 > 1.2.9） */
  const compareVersions = (a: string, b: string) => {
    const pa = a.split(".").map(Number);
    const pb = b.split(".").map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const diff = (pa[i] || 0) - (pb[i] || 0);
      if (diff !== 0) return diff;
    }
    return 0;
  };

  const filteredVersionList = computed(() => {
    if (!form.name) return [];
    return versionList.value
      .filter(v => v.ver_name === form.name)
      .sort((a, b) => compareVersions(a.version, b.version));
  });

  const selectedVersionMeta = computed(() =>
    versionList.value.find(
      v => v.ver_name === form.name && v.version === form.version
    )
  );

  const formRef = ref();
  const form = reactive({ name: "", version: "" });
  const submitting = ref(false);

  const rules = {
    name: [{ required: true, message: "请选择更新软件", trigger: "change" }],
    version: [{ required: true, message: "请选择目标版本", trigger: "change" }]
  };

  // 切换软件时清空已选版本，避免 ver_name 与 version 不匹配
  watch(
    () => form.name,
    () => {
      form.version = "";
    }
  );

  /** 按设备逐台调用 /version/update/add，共用同一 create_time 与版本元数据 */
  const handleSubmit = async () => {
    if (!selectedDevices.value.length) {
      ElMessage.warning("请先选择要更新的设备");
      return;
    }
    const valid = await formRef.value?.validate().catch(() => false);
    if (!valid) return;

    const deviceNames = selectedDevices.value
      .map(d => d.shipname_cn || d.devid)
      .join("、");

    try {
      await ElMessageBox.confirm(
        `确定要为以下设备添加更新任务吗？\n\n设备：${deviceNames}\n软件：${form.name}\n目标版本：${form.version}`,
        "确认添加版本更新",
        { confirmButtonText: "确定", cancelButtonText: "取消", type: "warning" }
      );
    } catch {
      return;
    }

    const meta = selectedVersionMeta.value;
    submitting.value = true;
    try {
      const createTime = formatNow();
      const results = await Promise.all(
        selectedDevices.value.map(device =>
          postVersionUpdateAdd({
            uuid: genUuid(),
            devid: device.devid,
            name: form.name,
            version: form.version,
            status: "0",
            progress: "0",
            url: meta?.url ?? "",
            path: meta?.path ?? "",
            create_time: createTime
          })
        )
      );
      const ok = results.length;
      ElMessage.success(
        `已为 ${ok} 台设备添加 ${form.name} ${form.version} 更新任务`
      );
      form.name = "";
      form.version = "";
      formRef.value?.resetFields();
      onSubmitted();
    } catch (err) {
      console.error("[software] /version/update/add 失败:", err);
      ElMessage.error("添加失败");
    } finally {
      submitting.value = false;
    }
  };

  onMounted(async () => {
    if (!boatStore.allBoats.length) {
      await boatStore.fetchBoatList();
    }
    await fetchVersionList();
  });

  return {
    allDevices,
    deviceSearch,
    filteredDevices,
    selectedDevices,
    deviceTableRef,
    handleSelectionChange,
    deviceColumns,
    versionsLoading,
    uniqueSoftwareList,
    filteredVersionList,
    formRef,
    form,
    rules,
    submitting,
    handleSubmit
  };
}
