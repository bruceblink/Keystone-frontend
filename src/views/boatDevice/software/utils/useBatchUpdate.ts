import { ref, reactive, computed, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import type { DeviceItem, UpdateRecord, SoftwareVersion } from "./types";
import { MOCK_DEVICES, MOCK_VERSIONS } from "./dict";

let _uidSeed = Date.now();
const genId = () => `upd-${_uidSeed++}`;

export function useBatchUpdate(onSubmitted: (records: UpdateRecord[]) => void) {
  // ===== 设备列表 =====
  const allDevices = ref<DeviceItem[]>(MOCK_DEVICES.map(d => ({ ...d })));
  const selectedDevices = ref<DeviceItem[]>([]);

  const handleSelectionChange = (rows: DeviceItem[]) => {
    selectedDevices.value = rows;
  };

  // ===== 设备表格列 =====
  const deviceColumns: TableColumnList = [
    { type: "selection", align: "center", width: 50 },
    { label: "设备编号", prop: "devid", minWidth: 110 },
    { label: "船名（中文）", prop: "shipname_cn", minWidth: 120 },
    { label: "船名（英文）", prop: "shipname_en", minWidth: 130 }
  ];

  // ===== 版本列表 =====
  const versionList = ref<SoftwareVersion[]>(
    MOCK_VERSIONS.map(v => ({ ...v }))
  );

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

  // ===== 表单 =====
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

  // ===== 提交 =====
  const handleSubmit = async () => {
    if (!selectedDevices.value.length) {
      ElMessage.warning("请先选择要更新的设备");
      return;
    }
    const valid = await formRef.value?.validate().catch(() => false);
    if (!valid) return;

    const deviceNames = selectedDevices.value
      .map(d => d.shipname_cn)
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

    submitting.value = true;
    try {
      const now = new Date().toISOString().replace("T", " ").substring(0, 19);
      const versionMeta = versionList.value.find(
        v => v.ver_name === form.name && v.version === form.version
      );
      const records: UpdateRecord[] = selectedDevices.value.map(d => ({
        uuid: genId(),
        devid: d.devid,
        shipname_cn: d.shipname_cn,
        name: form.name,
        version: form.version,
        size: versionMeta?.size || "",
        status: "0",
        progress: "0",
        create_time: now
      }));
      onSubmitted(records);
      ElMessage.success(
        `已为 ${records.length} 台设备添加 ${form.name} ${form.version} 更新任务`
      );
      form.name = "";
      form.version = "";
    } catch {
      ElMessage.error("添加失败");
    } finally {
      submitting.value = false;
    }
  };

  return {
    allDevices,
    selectedDevices,
    handleSelectionChange,
    deviceColumns,
    versionList,
    uniqueSoftwareList,
    filteredVersionList,
    formRef,
    form,
    rules,
    submitting,
    handleSubmit
  };
}
