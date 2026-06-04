<script setup lang="ts">
import { toRef, onMounted } from "vue";
import { useBoatStoreHook } from "@/store/modules/boat";
import { useShipShoreComm } from "./utils";
import OutputPanel from "./components/OutputPanel.vue";
import HistoryPanel from "./components/HistoryPanel.vue";
import CommandInput from "./components/CommandInput.vue";

defineOptions({ name: "ParamShipShoreComm" });

const boatStore = useBoatStoreHook();
const boatId = toRef(boatStore, "selectedBoatId");

const {
  userInput,
  commandInput,
  outputLines,
  isExecuting,
  commandHistory,
  showSuggestions,
  selectedSuggestionIndex,
  outputRef,
  waitTime,
  serviceType,
  showSettingsDialog,
  filteredSuggestions,
  handleUserInput,
  handleBlur,
  selectSuggestion,
  handleTabCompletion,
  navigateHistory,
  fillCommand,
  fillQuickCommand,
  clearPrefix,
  switchToDetectPath,
  switchToSyncPath,
  sendCommand,
  reExecuteCommand,
  toggleResult,
  clearHistory,
  confirmSettings,
  copyToClipboard,
  exportOutput,
  copyOutput,
  exportHistory,
  copyHistory
} = useShipShoreComm(boatId);

onMounted(() => {
  boatStore.fetchBoatList();
});
</script>

<template>
  <div class="main ship-shore-page">
    <!-- 船只选择栏 -->
    <div
      class="boat-selector-bar bg-bg_color w-[99/100] pl-8 pt-[12px] pb-[12px] flex items-center gap-4"
    >
      <span class="text-sm font-medium text-text_color_regular"
        >当前船只：</span
      >
      <el-select
        :model-value="boatStore.selectedBoatId"
        placeholder="请选择船只"
        clearable
        filterable
        :loading="boatStore.boatsLoading"
        :disabled="boatStore.isShipSide"
        class="!w-[320px]"
        @update:model-value="boatStore.setSelectedBoatId"
      >
        <el-option
          v-for="b in boatStore.allBoats"
          :key="b.devid"
          :label="`${b.devid} - ${b.shipname_cn}`"
          :value="b.devid"
        />
      </el-select>
      <el-tag v-if="boatStore.selectedBoat" type="success">
        {{ boatStore.selectedBoat.shipname_cn }}（{{
          boatStore.selectedBoat.devid
        }}）
      </el-tag>
      <el-alert
        v-else
        title="请先选择船只，再发送指令"
        type="warning"
        :closable="false"
        class="!py-1 !w-auto"
      />
    </div>

    <!-- 工具栏 -->
    <!-- <div class="toolbar bg-bg_color w-[99/100] pl-8 pr-8 py-3">
      <div class="toolbar__left">
        <div>
          <div class="toolbar__title">船岸指令交互</div>
          <div class="toolbar__sub">SHIP-SHORE COMMAND INTERACTION</div>
        </div>
      </div>
      <div class="toolbar__right">
        <el-button
          size="small"
          type="danger"
          plain
          :disabled="outputLines.length === 0"
          @click="clearOutput"
        >
          清空输出
        </el-button>
      </div>
    </div> -->

    <!-- 主内容区 -->
    <div class="content-area w-[99/100]">
      <!-- 上：输出 + 历史 -->
      <div ref="outputRef" class="panels-row">
        <OutputPanel
          :output-lines="outputLines"
          :is-executing="isExecuting"
          @export="exportOutput"
          @copy="copyOutput"
          @fill-quick-command="fillQuickCommand"
        />
        <HistoryPanel
          :command-history="commandHistory"
          @clear-history="clearHistory"
          @export-history="exportHistory"
          @copy-history="copyHistory"
          @fill-command="fillCommand"
          @re-execute="reExecuteCommand"
          @toggle-result="toggleResult"
          @copy-to-clipboard="copyToClipboard"
        />
      </div>

      <!-- 下：输入区 -->
      <CommandInput
        v-model:user-input="userInput"
        v-model:wait-time="waitTime"
        v-model:service-type="serviceType"
        v-model:show-settings-dialog="showSettingsDialog"
        :command-input="commandInput"
        :is-executing="isExecuting"
        :disable-send="
          !commandInput.trim() || isExecuting || !boatStore.selectedBoatId
        "
        :show-suggestions="showSuggestions"
        :filtered-suggestions="filteredSuggestions"
        :selected-suggestion-index="selectedSuggestionIndex"
        @send="sendCommand"
        @clear-prefix="clearPrefix"
        @switch-to-detect-path="switchToDetectPath"
        @switch-to-sync-path="switchToSyncPath"
        @handle-user-input="handleUserInput"
        @handle-blur="handleBlur"
        @navigate-history-up="navigateHistory('up')"
        @navigate-history-down="navigateHistory('down')"
        @handle-tab-completion="handleTabCompletion"
        @select-suggestion="selectSuggestion"
        @confirm-settings="confirmSettings"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.ship-shore-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 135px);
  min-height: 600px;
}

.boat-selector-bar {
  flex-shrink: 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.toolbar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--el-border-color-lighter);

  &__left {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  &__title {
    font-size: 15px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  &__sub {
    font-size: 11px;
    color: var(--el-text-color-placeholder);
    letter-spacing: 0.1em;
  }

  &__right {
    display: flex;
    gap: 10px;
    align-items: center;
  }
}

.content-area {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0;
  min-height: 0;
  padding: 12px 0 0;
}

.panels-row {
  display: flex;
  flex: 1;
  gap: 0;
  min-height: 0;
  border-bottom: 1px solid var(--el-border-color-lighter);

  // 输出面板占宽约 62%
  > :first-child {
    flex: 1.6;
    min-width: 0;
    // 去掉卡片圆角和部分边框，融入布局
    :deep(.el-card) {
      border-top: none;
      border-bottom: none;
      border-left: none;
      border-radius: 0;
    }
  }

  // 历史面板占宽约 38%
  > :last-child {
    flex: 1;
    min-width: 300px;
    max-width: 400px;

    :deep(.el-card) {
      border-top: none;
      border-right: none;
      border-bottom: none;
      border-radius: 0;
    }
  }
}

// 输入区卡片去圆角和顶边框
:deep(.cmd-input-card.el-card) {
  border-right: none;
  border-bottom: none;
  border-left: none;
  border-radius: 0;
}
</style>
