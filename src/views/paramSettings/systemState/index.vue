<script setup lang="ts">
import { toRef, onMounted } from "vue";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import Refresh from "@iconify-icons/ep/refresh";
import View from "@iconify-icons/ep/view";
import { CircleCheck, Warning } from "@element-plus/icons-vue";
import { useBoatStoreHook } from "@/store/modules/boat";
import { useSystemState } from "./utils";
import ModuleDetailDialog from "./components/ModuleDetailDialog.vue";

defineOptions({ name: "ParamSystemState" });

const boatStore = useBoatStoreHook();
const boatId = toRef(boatStore, "selectedBoatId");

const {
  loading,
  groupedMainModules,
  onlineCount,
  warningCount,
  todayTrafficText,
  todayTrafficUnit,
  okCount,
  errCount,
  detailVisible,
  currentGroup,
  dialogLabels,
  dialogTables,
  refreshStatus,
  viewDetail,
  getExt1Class,
  DEFAULT_DIALOG_LABELS
} = useSystemState(boatId);

onMounted(() => {
  boatStore.fetchBoatList();
});
</script>

<template>
  <div class="main system-state-page">
    <!-- 船只选择 -->
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
        title="请先选择船只，再查看系统状态"
        type="warning"
        :closable="false"
        class="!py-1 !w-auto"
      />
    </div>

    <!-- 顶部 KPI -->
    <div class="toolbar bg-bg_color w-[99/100] pl-8 pr-8 py-3">
      <div class="toolbar__left">
        <!-- <el-icon class="toolbar__icon" :size="22">
          <Monitor />
        </el-icon> -->
        <div>
          <div class="toolbar__title">系统状态监控</div>
          <div class="toolbar__sub">SYSTEM STATUS MONITOR</div>
        </div>
      </div>

      <div class="toolbar__kpi">
        <div class="kpi-item">
          <span class="kpi-item__val"
            >{{ todayTrafficText }}<em>{{ todayTrafficUnit }}</em></span
          >
          <span class="kpi-item__lbl">今日流量</span>
        </div>
        <el-divider direction="vertical" />
        <div class="kpi-item kpi-item--ok">
          <span class="kpi-item__val">{{ onlineCount }}</span>
          <span class="kpi-item__lbl">主模块</span>
        </div>
        <el-divider direction="vertical" />
        <div class="kpi-item">
          <span class="kpi-item__val">{{ warningCount }}</span>
          <span class="kpi-item__lbl">子模块</span>
        </div>
      </div>

      <div class="toolbar__right">
        <span class="legend legend--ok"> <i />正常 {{ okCount }} </span>
        <span class="legend legend--err"> <i />异常 {{ errCount }} </span>
        <el-button
          type="primary"
          :icon="useRenderIcon(Refresh)"
          :loading="loading"
          :disabled="!boatStore.selectedBoatId"
          @click="refreshStatus"
        >
          刷新
        </el-button>
      </div>
    </div>

    <!-- 模块卡片 -->
    <div
      v-loading="loading"
      class="grid-wrap bg-bg_color w-[99/100] pl-8 pr-8 pb-6"
    >
      <el-empty
        v-if="!loading && groupedMainModules.length === 0"
        description="暂无模块状态数据"
        class="py-16"
      />

      <el-row v-else :gutter="16">
        <el-col
          v-for="(row, index) in groupedMainModules"
          :key="row.mainModule"
          :xs="24"
          :sm="12"
          :md="8"
          :lg="6"
          :xl="6"
        >
          <el-card
            shadow="hover"
            class="module-card"
            :class="
              row.statusClass === 'is-success'
                ? 'module-card--ok'
                : 'module-card--err'
            "
            @click="viewDetail(row)"
          >
            <div class="module-card__index">
              {{ String(index + 1).padStart(2, "0") }}
            </div>

            <div class="module-card__ring">
              <el-icon
                v-if="row.statusClass === 'is-success'"
                class="ring-ico ring-ico--ok"
                :size="40"
              >
                <CircleCheck />
              </el-icon>
              <el-icon v-else class="ring-ico ring-ico--err" :size="40">
                <Warning />
              </el-icon>
            </div>

            <div class="module-card__name">{{ row.mainModule }}</div>

            <div class="module-card__meta">
              <span class="module-card__count">{{ row.items.length }}</span>
              <span class="module-card__lbl">个子模块</span>
            </div>

            <el-tag
              :type="row.statusClass === 'is-success' ? 'success' : 'danger'"
              size="small"
              class="module-card__pill"
            >
              {{ row.statusText }}
            </el-tag>

            <el-button
              type="primary"
              link
              :icon="useRenderIcon(View)"
              class="module-card__btn"
              @click.stop="viewDetail(row)"
            >
              查看详情
            </el-button>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <ModuleDetailDialog
      v-model:visible="detailVisible"
      :group="currentGroup"
      :tables="dialogTables"
      :labels="dialogLabels"
      :default-labels="DEFAULT_DIALOG_LABELS"
      :get-ext1-class="getExt1Class"
    />
  </div>
</template>

<style scoped lang="scss">
.system-state-page {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 120px);
}

.boat-selector-bar {
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: center;
  border-bottom: 1px solid var(--el-border-color-lighter);

  &__left {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  &__icon {
    color: var(--el-color-primary);
  }

  &__title {
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  &__sub {
    font-size: 11px;
    color: var(--el-text-color-secondary);
    letter-spacing: 0.12em;
  }

  &__kpi {
    display: flex;
    flex: 1;
    gap: 8px;
    align-items: center;
    justify-content: center;
  }

  &__right {
    display: flex;
    gap: 16px;
    align-items: center;
    margin-left: auto;
  }
}

.kpi-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 16px;

  &__val {
    font-size: 22px;
    font-weight: 700;
    line-height: 1.2;
    color: var(--el-color-primary);

    em {
      margin-left: 2px;
      font-size: 12px;
      font-style: normal;
      font-weight: 500;
      color: var(--el-text-color-secondary);
    }
  }

  &__lbl {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  &--ok .kpi-item__val {
    color: var(--el-color-success);
  }
}

.legend {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  font-size: 13px;

  i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  &--ok {
    color: var(--el-color-success);

    i {
      background: var(--el-color-success);
    }
  }

  &--err {
    color: var(--el-color-danger);

    i {
      background: var(--el-color-danger);
    }
  }
}

.grid-wrap {
  flex: 1;
  min-height: 0;
}

.module-card {
  position: relative;
  margin-bottom: 16px;
  text-align: center;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
  }

  &--ok {
    border-color: rgb(var(--el-color-success-rgb) 0.35);
  }

  &--err {
    border-color: rgb(var(--el-color-danger-rgb) 0.35);
  }

  &__index {
    position: absolute;
    top: 10px;
    left: 12px;
    font-family: "Courier New", monospace;
    font-size: 11px;
    color: var(--el-text-color-placeholder);
  }

  &__ring {
    display: flex;
    justify-content: center;
    padding: 20px 0 12px;
  }

  &__name {
    min-height: 42px;
    margin-bottom: 8px;
    font-size: 15px;
    font-weight: 600;
    line-height: 1.4;
  }

  &__meta {
    margin-bottom: 8px;
  }

  &__count {
    margin-right: 4px;
    font-size: 26px;
    font-weight: 700;
    color: var(--el-color-primary);
  }

  &__lbl {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  &__pill {
    margin-bottom: 8px;
  }

  &__btn {
    justify-content: center;
    width: 100%;
  }
}

.ring-ico--ok {
  color: var(--el-color-success);
}

.ring-ico--err {
  color: var(--el-color-danger);
}
</style>
