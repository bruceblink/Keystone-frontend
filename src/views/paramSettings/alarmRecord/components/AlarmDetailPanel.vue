<script setup lang="ts">
import type { AlarmRecordItem, MediaItem } from "../utils/types";

defineProps<{
  row: AlarmRecordItem | null;
  mediaList: MediaItem[];
  alarmTypeLabel: string;
  regionName: string;
  getDutyLevelText: (level: string | number | null | undefined) => string;
  formatCoord: (val: string | number | null | undefined) => string;
}>();

const emit = defineEmits<{
  preview: [url: string, index: number];
}>();
</script>

<template>
  <div v-if="row" class="detail-panel">
    <div v-if="mediaList.length" class="detail-panel__carousel">
      <el-carousel
        :autoplay="false"
        indicator-position="outside"
        height="220px"
      >
        <el-carousel-item
          v-for="(item, idx) in mediaList"
          :key="idx"
          @click="emit('preview', item.url, idx)"
        >
          <img :src="item.url" class="detail-panel__img" alt="报警图片" />
        </el-carousel-item>
      </el-carousel>
    </div>
    <el-empty v-else description="暂无图片" :image-size="80" />

    <div class="detail-panel__info">
      <div class="info-grid">
        <div class="info-item">
          <span class="info-item__label">报警原因</span>
          <span class="info-item__value">{{ alarmTypeLabel || "—" }}</span>
        </div>
        <div class="info-item">
          <span class="info-item__label">设备编号</span>
          <span class="info-item__value">{{ row.camid || "—" }}</span>
        </div>
        <div class="info-item">
          <span class="info-item__label">事件地点</span>
          <span class="info-item__value">{{ row.address || "—" }}</span>
        </div>
        <div class="info-item">
          <span class="info-item__label">航速 / kn</span>
          <span class="info-item__value">{{
            row.speed != null && row.speed !== ""
              ? Number(row.speed).toFixed(1)
              : "0"
          }}</span>
        </div>
        <div class="info-item">
          <span class="info-item__label">报警等级</span>
          <el-tag
            :type="
              String(row.level) === '3'
                ? 'danger'
                : String(row.level) === '2'
                ? 'warning'
                : 'success'
            "
            size="small"
          >
            {{ getDutyLevelText(row.level) }}
          </el-tag>
        </div>
        <div class="info-item">
          <span class="info-item__label">所属水域</span>
          <span class="info-item__value">{{ regionName }}</span>
        </div>
        <div class="info-item">
          <span class="info-item__label">船位经度</span>
          <span class="info-item__value mono">{{ formatCoord(row.lng) }}</span>
        </div>
        <div class="info-item">
          <span class="info-item__label">船位纬度</span>
          <span class="info-item__value mono">{{ formatCoord(row.lat) }}</span>
        </div>
        <div class="info-item info-item--wide">
          <span class="info-item__label">事件时间</span>
          <span class="info-item__value mono">{{ row.stime || "—" }}</span>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="detail-panel detail-panel--empty">
    <el-empty description="点击左侧列表查看详情" :image-size="100" />
  </div>
</template>

<style scoped lang="scss">
.detail-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;

  &--empty {
    align-items: center;
    justify-content: center;
  }

  &__carousel {
    flex-shrink: 0;
    overflow: hidden;
    background: #000;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
  }

  &__img {
    width: 100%;
    height: 220px;
    cursor: zoom-in;
    object-fit: contain;
  }

  &__info {
    flex: 1;
    padding: 12px;
    overflow-y: auto;
    background: var(--el-fill-color-blank);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
  }
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;

  &--wide {
    grid-column: 1 / -1;
  }

  &__label {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  &__value {
    font-size: 14px;
    font-weight: 500;
    color: var(--el-text-color-primary);
    word-break: break-all;

    &.mono {
      font-family: "Courier New", monospace;
      font-size: 13px;
    }
  }
}
</style>
