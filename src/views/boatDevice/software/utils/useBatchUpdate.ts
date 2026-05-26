import { ref, reactive, computed, watch, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  getDeviceVersionQuery,
  postVersionUpdateAdd,
  type DeviceVersionItemDTO
} from "@/api/boatDevice/software";
import { useBoatStoreHook } from "@/store/modules/boat";
import type { DeviceItem, SoftwareVersion } from "./types";

const genUuid = () =>
  crypto.randomUUID
    ? crypto.randomUUID()
    : `upd-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const formatNow = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const normalizeVersion = (item: DeviceVersionItemDTO): SoftwareVersion => ({
  uuid: String(item.uuid ?? ""),
  ver_name: String(item.ver_name ?? ""),
  version: String(item.version ?? ""),
  size: String(item.size ?? ""),
  create_time: String(item.create_time ?? ""),
  url: String(item.url ?? item.fileUrl ?? ""),
  path: String(item.path ?? item.client_path ?? "")
});

export function useBatchUpdate(onSubmitted: () => void) {
  const boatStore = useBoatStoreHook();
  const versionsLoading = ref(false);

  const allDevices = computed<DeviceItem[]>(() =>
    boatStore.allBoats.map(b => ({
      devid: b.devid,
      shipname_cn: b.shipname_cn,
      shipname_en: b.shipname_en,
      type: b.type
    }))
  );

  const selectedDevices = ref<DeviceItem[]>([]);
  const handleSelectionChange = (rows: DeviceItem[]) => {
    selectedDevices.value = rows;
  };

  const deviceColumns: TableColumnList = [
    { type: "selection", align: "center", width: 50 },
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

  watch(
    () => form.name,
    () => {
      form.version = "";
    }
  );

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
    selectedDevices,
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
