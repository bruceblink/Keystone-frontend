import { ref, computed, watch, type Ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import type {
  AlarmConfigTypeItem,
  AlarmConfigRecord,
  CameraItem,
  ExtParam,
  AreaItem
} from "./types";
import {
  addAlarmCondition,
  updateAlarmCondition,
  deleteAlarmConditionById,
  getAlarmConditionList,
  getReasonOpsQuery,
  downloadCameraScreenshot,
  parseScreenshotUrl,
  type AlarmConditionSaveDTO
} from "@/api/paramSettings/alarmConfig";
import { getDeviceListQuery } from "@/api/paramSettings/device";
import {
  FALLBACK_ALARM_PARAM_DEFS,
  formatDateTime,
  genId,
  normalizeAlarmConfigRecord,
  reasonOpsToExtParams
} from "./dict";

const CAMERA_TYPE = "0";

/**
 * 报警规则详情页：摄像机、参数、区域绘制与保存
 */
export function useAlarmConfigDetail(
  boatId: Ref<string>,
  alarmType: Ref<AlarmConfigTypeItem | null>
) {
  const detailLoading = ref(false);
  const cameraList = ref<CameraItem[]>([]);
  const alarmRecords = ref<AlarmConfigRecord[]>([]);
  const reasonOps = ref<Record<string, string | undefined> | null>(null);

  const treeRef = ref<InstanceType<any> | null>(null);
  const treeProps = { children: "children", label: "devname" };
  const selectedCamIds = ref<string[]>([]);
  const currentCamera = ref<CameraItem | null>(null);
  const paramValues = ref<Record<string, string>>({});
  const currentShapes = ref<AreaItem[]>([]);
  const cameraImageUrl = ref("");
  const imageLoadingError = ref(false);

  /** 参数表单项：优先接口 reason/ops，否则本地兜底 */
  const validParams = computed<ExtParam[]>(() => {
    const fromApi = reasonOpsToExtParams(reasonOps.value ?? undefined);
    if (fromApi.length) return fromApi;
    const id = alarmType.value?.id ?? "";
    return FALLBACK_ALARM_PARAM_DEFS[id] ?? [];
  });

  const getAlarmRecords = () =>
    alarmRecords.value.filter(
      r => String(r.alarmtype) === String(alarmType.value?.id ?? "")
    );

  const isCameraConfigured = (camid: string) =>
    getAlarmRecords().some(r => r.camid === camid);

  /**
   * 拉取摄像机列表（type=0）
   */
  const fetchCameras = async () => {
    if (!boatId.value) {
      cameraList.value = [];
      return;
    }
    try {
      const res = await getDeviceListQuery(boatId.value);
      const list = Array.isArray(res.data) ? res.data : [];
      cameraList.value = list
        .filter(item => String(item.type) === CAMERA_TYPE)
        .map(item => ({
          camid: item.camid ?? "",
          devname: item.devname ?? item.camid ?? "",
          type: String(item.type ?? CAMERA_TYPE),
          url: item.url ?? ""
        }));
    } catch (err) {
      console.error("[alarmConfig] 查询摄像机列表失败:", err);
      cameraList.value = [];
    }
  };

  /**
   * 拉取当前算法的报警参数列表
   */
  const fetchAlarmRecords = async () => {
    const typeId = alarmType.value?.id;
    if (!boatId.value || !typeId) {
      alarmRecords.value = [];
      return;
    }
    try {
      const res = await getAlarmConditionList(boatId.value, typeId);
      const list = Array.isArray(res.data) ? res.data : [];
      alarmRecords.value = list.map(normalizeAlarmConfigRecord);
    } catch (err) {
      console.error("[alarmConfig] 查询算法报警参数失败:", err);
      alarmRecords.value = [];
    }
  };

  /**
   * 拉取算法参数定义 reason/ops/query
   */
  const fetchReasonOps = async () => {
    const typeId = alarmType.value?.id;
    if (!boatId.value || !typeId) {
      reasonOps.value = null;
      return;
    }
    try {
      const res = await getReasonOpsQuery(boatId.value, typeId);
      const list = Array.isArray(res.data) ? res.data : [];
      reasonOps.value = list[0] ?? null;
    } catch (err) {
      console.error("[alarmConfig] 查询参数定义失败:", err);
      reasonOps.value = null;
    }
  };

  /**
   * 刷新详情页全部数据
   */
  const refreshDetail = async () => {
    if (!boatId.value || !alarmType.value) return;
    detailLoading.value = true;
    try {
      await Promise.all([
        fetchCameras(),
        fetchAlarmRecords(),
        fetchReasonOps()
      ]);
      syncSelectedCameras();
    } finally {
      detailLoading.value = false;
    }
  };

  /** 同步树勾选：已配置摄像机 */
  const syncSelectedCameras = () => {
    const configured = getAlarmRecords().map(r => r.camid);
    selectedCamIds.value = cameraList.value
      .filter(c => configured.includes(c.camid))
      .map(c => c.camid);
    treeRef.value?.setCheckedKeys(selectedCamIds.value);
  };

  const handleCheck = (
    _: CameraItem,
    { checkedKeys }: { checkedKeys: (string | number)[] }
  ) => {
    selectedCamIds.value = checkedKeys.map(String);
  };

  const handleParamInput = (value: string, key: string) => {
    if (/[\u4e00-\u9fa5]/.test(value)) {
      paramValues.value[key] = value.replace(/[\u4e00-\u9fa5]/g, "");
      ElMessage.warning("不能输入中文");
      return;
    }
    if (/[a-zA-Z]/.test(value)) {
      paramValues.value[key] = value.replace(/[a-zA-Z]/g, "");
      ElMessage.warning("不能输入英文");
      return;
    }
    paramValues.value[key] = value;
  };

  /**
   * 加载摄像机快照
   */
  const loadCameraImage = async (camera: CameraItem) => {
    if (!boatId.value || !camera.camid) return;
    imageLoadingError.value = false;
    cameraImageUrl.value = "";
    try {
      const res = await downloadCameraScreenshot({
        devid: boatId.value,
        camid: camera.camid,
        rtspurl: camera.url ?? ""
      });
      const url = parseScreenshotUrl(res.data);
      if (!url) {
        imageLoadingError.value = true;
        return;
      }
      cameraImageUrl.value = url;
    } catch (err) {
      console.error("[alarmConfig] 加载摄像机画面失败:", err);
      imageLoadingError.value = true;
    }
  };

  /**
   * 回填当前摄像机的参数与区域
   */
  const loadCameraData = (camid: string) => {
    const record = getAlarmRecords().find(r => r.camid === camid);
    if (record) {
      for (let i = 1; i <= 8; i++) {
        const key = `ext${i}` as keyof AlarmConfigRecord;
        paramValues.value[`ext${i}`] = (record[key] as string) ?? "";
      }
      currentShapes.value = record.area ? [...record.area] : [];
    } else {
      paramValues.value = {};
      currentShapes.value = [];
    }
  };

  /**
   * 切换当前编辑的摄像机
   */
  const switchCamera = async (data: CameraItem) => {
    currentCamera.value = data;
    loadCameraData(data.camid);
    await loadCameraImage(data);
  };

  const buildSavePayload = (
    camid: string,
    shapes: AreaItem[],
    existing?: AlarmConfigRecord
  ): AlarmConditionSaveDTO => ({
    _id: existing?._id,
    sid: existing?.sid ?? String(alarmType.value?.id ?? ""),
    camid,
    alarmtype: String(alarmType.value?.id ?? ""),
    devid: boatId.value,
    ext1: paramValues.value.ext1 ?? "",
    ext2: paramValues.value.ext2 ?? "",
    ext3: paramValues.value.ext3 ?? "",
    ext4: paramValues.value.ext4 ?? "",
    ext5: paramValues.value.ext5 ?? "",
    ext6: paramValues.value.ext6 ?? "",
    ext7: paramValues.value.ext7 ?? "",
    ext8: paramValues.value.ext8 ?? "",
    area: shapes,
    create_time: existing?.create_time ?? formatDateTime(new Date())
  });

  /**
   * 保存当前摄像机配置（新增或更新）
   */
  const executeSave = async (shapes: AreaItem[]) => {
    const camid = currentCamera.value?.camid;
    if (!camid || !boatId.value || !alarmType.value) {
      ElMessage.warning("请先选择摄像机");
      return;
    }

    const hasEmpty = validParams.value.some(p => {
      const v = paramValues.value[p.key];
      return v === undefined || v === null || String(v).trim() === "";
    });
    if (hasEmpty) {
      ElMessage.warning("请填写完整的参数配置信息");
      return;
    }

    const existing = getAlarmRecords().find(r => r.camid === camid);
    const payload = buildSavePayload(camid, shapes, existing);

    try {
      if (existing) {
        await updateAlarmCondition(boatId.value, payload);
        ElMessage.success("更新成功");
      } else {
        await addAlarmCondition(boatId.value, {
          ...payload,
          _id: genId()
        });
        ElMessage.success("保存成功");
      }
      await fetchAlarmRecords();
      syncSelectedCameras();
    } catch (err) {
      console.error("[alarmConfig] 保存报警参数失败:", err);
    }
  };

  /**
   * 删除当前摄像机报警参数
   */
  const deleteCurrentAlarm = async () => {
    const camid = currentCamera.value?.camid;
    if (!camid) return;
    const record = getAlarmRecords().find(r => r.camid === camid);
    if (!record?._id) return;
    try {
      await deleteAlarmConditionById(record._id);
      paramValues.value = {};
      currentShapes.value = [];
      cameraImageUrl.value = "";
      await fetchAlarmRecords();
      syncSelectedCameras();
      ElMessage.success("已删除该摄像机的配置");
    } catch (err) {
      console.error("[alarmConfig] 删除报警参数失败:", err);
    }
  };

  /**
   * 保存按钮：处理未勾选摄像机时删除已配置项
   */
  const handleSave = async (getShapes: () => AreaItem[]) => {
    const camid = currentCamera.value?.camid;
    if (!camid) {
      ElMessage.warning("请先选择摄像机");
      return;
    }

    if (!selectedCamIds.value.includes(camid)) {
      const hasRecord = getAlarmRecords().some(r => r.camid === camid);
      if (hasRecord) {
        try {
          await ElMessageBox.confirm(
            "当前摄像机未勾选，继续将删除该摄像机的已配置参数，是否继续？",
            "提示",
            {
              confirmButtonText: "继续",
              cancelButtonText: "取消",
              type: "warning"
            }
          );
          await deleteCurrentAlarm();
        } catch {
          /* 取消 */
        }
        return;
      }
    }

    await executeSave(getShapes());
  };

  watch(
    () => [boatId.value, alarmType.value?.id] as const,
    () => {
      currentCamera.value = null;
      paramValues.value = {};
      currentShapes.value = [];
      cameraImageUrl.value = "";
      imageLoadingError.value = false;
      if (boatId.value && alarmType.value) refreshDetail();
    },
    { immediate: true }
  );

  return {
    detailLoading,
    cameraList,
    alarmRecords,
    treeRef,
    treeProps,
    selectedCamIds,
    currentCamera,
    paramValues,
    currentShapes,
    cameraImageUrl,
    imageLoadingError,
    validParams,
    isCameraConfigured,
    handleCheck,
    handleParamInput,
    switchCamera,
    loadCameraData,
    handleSave,
    refreshDetail,
    syncSelectedCameras
  };
}
