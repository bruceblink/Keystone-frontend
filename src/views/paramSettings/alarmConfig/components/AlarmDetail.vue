<script setup lang="ts">
import { ref, toRef } from "vue";
import { QuestionFilled } from "@element-plus/icons-vue";
import AlarmDrawCanvas from "./AlarmDrawCanvas.vue";
import type { AlarmConfigTypeItem } from "../utils/types";
import { useAlarmConfigDetail } from "../utils/configDetail";

const props = defineProps<{
  alarmType: AlarmConfigTypeItem;
  boatId: string;
}>();

const alarmTypeRef = toRef(props, "alarmType");
const boatIdRef = toRef(props, "boatId");

const {
  detailLoading,
  cameraList,
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
  handleSave
} = useAlarmConfigDetail(boatIdRef, alarmTypeRef);

const canvasRef = ref<InstanceType<typeof AlarmDrawCanvas> | null>(null);

const onSave = () => {
  handleSave(() => canvasRef.value?.getShapes() ?? []);
};
</script>

<template>
  <div v-loading="detailLoading" class="flex w-full h-full gap-3 min-h-0">
    <!-- 左侧面板 -->
    <div
      class="w-[320px] min-w-[260px] shrink-0 flex flex-col gap-3 h-full min-h-0"
    >
      <!-- 摄像机列表 -->
      <div
        class="flex flex-1 flex-col min-h-0 bg-[var(--el-bg-color)] border border-[var(--el-border-color-lighter)] rounded-lg overflow-hidden"
      >
        <div
          class="px-4 py-3 text-sm font-semibold text-[var(--el-text-color-primary)] border-b border-[var(--el-border-color-lighter)] shrink-0 bg-[var(--el-fill-color-lighter)]"
        >
          摄像机列表
        </div>
        <div class="p-3 flex-1 min-h-0 overflow-y-auto">
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
        class="flex flex-1 flex-col min-h-0 bg-[var(--el-bg-color)] border border-[var(--el-border-color-lighter)] rounded-lg overflow-hidden"
      >
        <div
          class="px-4 py-3 text-sm font-semibold text-[var(--el-text-color-primary)] border-b border-[var(--el-border-color-lighter)] shrink-0 bg-[var(--el-fill-color-lighter)]"
        >
          参数配置
        </div>
        <div class="p-3 flex-1 min-h-0 overflow-y-auto flex flex-col gap-3">
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
    <div class="flex-1 min-w-0 relative flex flex-col min-h-0">
      <AlarmDrawCanvas
        ref="canvasRef"
        :initial-shapes="currentShapes"
        :image-url="cameraImageUrl"
        :image-error="imageLoadingError"
        class="w-full flex-1 min-h-0"
      >
        <template #save-btn>
          <el-button
            v-if="currentCamera"
            type="primary"
            size="small"
            @click="onSave"
          >
            保存配置
          </el-button>
        </template>
      </AlarmDrawCanvas>

      <div
        v-if="!currentCamera"
        class="absolute inset-0 flex items-center justify-center bg-[var(--el-bg-color)] rounded-lg pointer-events-none z-10"
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
