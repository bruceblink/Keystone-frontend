<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { QuestionFilled } from "@element-plus/icons-vue";
import AlarmDrawCanvas from "./AlarmDrawCanvas.vue";
import type {
  AlarmConfigTypeItem,
  CameraItem,
  AreaItem,
  AlarmConfigRecord,
  ExtParam
} from "../utils/types";
import {
  MOCK_CAMERAS,
  ALARM_PARAM_DEFS,
  getBoatAlarmConfigs,
  upsertAlarmConfig,
  removeAlarmConfig,
  genId,
  formatDateTime
} from "../utils/dict";

const props = defineProps<{
  alarmType: AlarmConfigTypeItem;
  boatId: string;
}>();

// ===== 摄像机列表 =====
const cameraList = ref<CameraItem[]>(MOCK_CAMERAS);
const treeRef = ref<InstanceType<any> | null>(null);
const treeProps = { children: "children", label: "devname" };
const selectedCamIds = ref<string[]>([]);
const currentCamera = ref<CameraItem | null>(null);

const getAlarmRecords = (): AlarmConfigRecord[] => {
  if (!props.boatId) return [];
  return getBoatAlarmConfigs(props.boatId).filter(
    r => String(r.alarmtype) === String(props.alarmType.id)
  );
};

const isCameraConfigured = (camid: string) =>
  getAlarmRecords().some(r => r.camid === camid);

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

// ===== 参数定义 =====
const validParams = computed<ExtParam[]>(
  () => ALARM_PARAM_DEFS[props.alarmType.id] ?? []
);
const paramValues = ref<Record<string, string>>({});

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

// ===== 摄像机切换 =====
const currentShapes = ref<AreaItem[]>([]);
const canvasRef = ref<InstanceType<typeof AlarmDrawCanvas> | null>(null);

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
  canvasRef.value?.resetShapes(currentShapes.value);
};

const switchCamera = (data: CameraItem) => {
  currentCamera.value = data;
  loadCameraData(data.camid);
};

// ===== 保存 =====
const executeSave = () => {
  const camid = currentCamera.value?.camid;
  if (!camid) {
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

  const shapes = canvasRef.value?.getShapes() ?? [];
  const extData: Record<string, string> = {};
  for (let i = 1; i <= 8; i++)
    extData[`ext${i}`] = paramValues.value[`ext${i}`] ?? "";

  const existing = getAlarmRecords().find(r => r.camid === camid);
  const record: AlarmConfigRecord = {
    _id: existing?._id ?? genId(),
    sid: existing?.sid ?? genId(),
    camid,
    alarmtype: String(props.alarmType.id),
    devid: props.boatId,
    ext1: extData.ext1,
    ext2: extData.ext2,
    ext3: extData.ext3,
    ext4: extData.ext4,
    ext5: extData.ext5,
    ext6: extData.ext6,
    ext7: extData.ext7,
    ext8: extData.ext8,
    area: shapes,
    create_time: existing?.create_time ?? formatDateTime(new Date())
  };
  upsertAlarmConfig(props.boatId, record);
  syncSelectedCameras();
  ElMessage.success(existing ? "更新成功" : "保存成功");
};

const handleSave = async () => {
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
        const record = getAlarmRecords().find(r => r.camid === camid);
        if (record) {
          removeAlarmConfig(props.boatId, record._id);
          paramValues.value = {};
          currentShapes.value = [];
          canvasRef.value?.resetShapes([]);
          syncSelectedCameras();
          ElMessage.success("已删除该摄像机的配置");
        }
      } catch {
        /* 取消 */
      }
      return;
    }
  }
  executeSave();
};

// ===== 初始化 =====
watch(
  () => [props.alarmType.id, props.boatId],
  () => {
    currentCamera.value = null;
    paramValues.value = {};
    currentShapes.value = [];
    syncSelectedCameras();
  },
  { immediate: true }
);
</script>

<template>
  <div class="flex w-full h-full gap-3">
    <!-- 左侧面板 -->
    <div class="w-[320px] min-w-[260px] shrink-0 flex flex-col gap-3">
      <!-- 摄像机列表 -->
      <div
        class="flex flex-col bg-[var(--el-bg-color)] border border-[var(--el-border-color-lighter)] rounded-lg overflow-hidden h-[520px]"
      >
        <div
          class="px-4 py-3 text-sm font-semibold text-[var(--el-text-color-primary)] border-b border-[var(--el-border-color-lighter)] shrink-0 bg-[var(--el-fill-color-lighter)]"
        >
          摄像机列表
        </div>
        <div class="p-3 h-[360px] overflow-y-auto">
          <el-tree
            ref="treeRef"
            :data="cameraList"
            node-key="camid"
            :props="treeProps"
            :highlight-current="true"
            :current-node-key="currentCamera?.camid"
            :default-checked-keys="selectedCamIds"
            :check-strictly="true"
            :expand-on-click-node="false"
            :check-on-click-node="false"
            show-checkbox
            @check="handleCheck"
          >
            <template #default="{ data }">
              <div
                class="flex items-center justify-between w-full gap-2 min-w-0"
              >
                <span
                  class="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap cursor-pointer text-base px-2 py-1 rounded transition-colors duration-150 hover:text-[var(--el-color-primary)] hover:bg-[var(--el-color-primary-light-9)]"
                  @click.stop="switchCamera(data)"
                >
                  {{ data.devname }}
                </span>
                <el-tag
                  v-if="isCameraConfigured(data.camid)"
                  type="success"
                  size="small"
                  effect="plain"
                >
                  已配置
                </el-tag>
              </div>
            </template>
          </el-tree>
        </div>
      </div>

      <!-- 参数配置 -->
      <div
        class="flex flex-col bg-[var(--el-bg-color)] border border-[var(--el-border-color-lighter)] rounded-lg overflow-hidden h-[520px]"
      >
        <div
          class="px-4 py-3 text-sm font-semibold text-[var(--el-text-color-primary)] border-b border-[var(--el-border-color-lighter)] shrink-0 bg-[var(--el-fill-color-lighter)]"
        >
          参数配置
        </div>
        <div class="p-3 h-[300px] overflow-y-auto flex flex-col gap-3">
          <template v-if="currentCamera && validParams.length > 0">
            <div
              v-for="item in validParams"
              :key="item.key"
              class="flex flex-col gap-1.5"
            >
              <div
                class="flex items-center gap-1.5 text-base font-medium text-[var(--el-text-color-regular)]"
              >
                <span>{{ item.name }}</span>
                <el-tooltip :content="item.description" placement="right">
                  <el-icon
                    class="!text-[var(--el-text-color-placeholder)] cursor-help shrink-0"
                  >
                    <QuestionFilled />
                  </el-icon>
                </el-tooltip>
              </div>
              <el-input
                v-model="paramValues[item.key]"
                :placeholder="`请输入${item.name}`"
                size="large"
                @input="(v: string) => handleParamInput(v, item.key)"
              />
            </div>
          </template>
          <el-empty
            v-else
            :description="currentCamera ? '暂无参数配置' : '请先选择摄像机'"
            :image-size="64"
          />
        </div>
      </div>
    </div>

    <!-- 右侧画布区 -->
    <div class="flex-1 min-w-0 relative max-h-[1050px]">
      <AlarmDrawCanvas
        ref="canvasRef"
        :initial-shapes="currentShapes"
        :readonly="false"
        class="w-full"
      >
        <template #save-btn>
          <el-button
            v-if="currentCamera"
            type="primary"
            size="small"
            @click="handleSave"
          >
            保存配置
          </el-button>
        </template>
      </AlarmDrawCanvas>

      <!-- 未选摄像机遮罩 -->
      <div
        v-if="!currentCamera"
        class="absolute inset-0 flex items-center justify-center bg-[var(--el-bg-color)] rounded-lg pointer-events-none"
      >
        <el-empty description="请在左侧选择摄像机" :image-size="80" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
:deep(.el-tree-node__content) {
  height: 38px;
}

::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

::-webkit-scrollbar-thumb {
  background: var(--el-scrollbar-hover-bg-color, #c0c4cc);
  border-radius: 4px;
}

::-webkit-scrollbar-track {
  background: transparent;
}
</style>
