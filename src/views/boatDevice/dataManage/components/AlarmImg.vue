<script setup lang="ts">
import { computed, watch, ref, onMounted, onUnmounted } from "vue";
import { utcToLocalByLng } from "@/utils/timeUtils";
import type { AlarmRecord } from "../utils/dict";

const props = defineProps<{
  rowData: AlarmRecord | null;
  alarmTypeNameMap: Record<number, string>;
  shipNameMap: Record<string, string>;
  regionMap: Record<number, string>;
}>();

const rowData = computed(() => props.rowData);

/* ----- 媒体资源 ----- */
interface MediaItem {
  type: "img" | "video";
  url: string;
}
const mediaList = ref<MediaItem[]>([]);
const selectedImg = ref(0);
const videoConnectionBtn = ref(false);
const disconnectVideo = () => {
  videoConnectionBtn.value = false;
};

const updateMediaList = (data: AlarmRecord) => {
  mediaList.value = [];
  selectedImg.value = 0;
  for (let i = 1; i <= 4; i++) {
    const url = data[`picurl${i}` as keyof AlarmRecord] as string;
    if (url && /\.jpg$|\.jpeg$|\.png$|\.gif$|\.bmp$|\.webp$/i.test(url)) {
      mediaList.value.push({ type: "img", url });
    }
  }
  if (
    data.videourl &&
    /\.mp4$|\.avi$|\.mov$|\.mkv$|\.flv$|\.wmv$|\.m3u8$/i.test(data.videourl)
  ) {
    mediaList.value.push({ type: "video", url: data.videourl });
  }
};

watch(
  rowData,
  newVal => {
    if (newVal) {
      disconnectVideo();
      updateMediaList(newVal);
    }
  },
  { deep: true, immediate: true }
);

/* ----- 导航 ----- */
const getImageIndexes = () =>
  mediaList.value
    .map((item, index) => ({ ...item, originalIndex: index }))
    .filter(item => item.type === "img")
    .map(item => item.originalIndex);

const handleLeftArrowClick = () => {
  if (!mediaList.value.length) return;
  if (
    mediaList.value[selectedImg.value]?.type === "video" &&
    videoConnectionBtn.value
  )
    disconnectVideo();
  if (showBigImg.value) {
    const idxs = getImageIndexes();
    if (!idxs.length) return;
    const cur = idxs.indexOf(selectedImg.value);
    selectedImg.value = cur === 0 ? idxs[idxs.length - 1] : idxs[cur - 1];
  } else {
    selectedImg.value =
      selectedImg.value > 0
        ? selectedImg.value - 1
        : mediaList.value.length - 1;
  }
};

const handleRightArrowClick = () => {
  if (!mediaList.value.length) return;
  if (
    mediaList.value[selectedImg.value]?.type === "video" &&
    videoConnectionBtn.value
  )
    disconnectVideo();
  if (showBigImg.value) {
    const idxs = getImageIndexes();
    if (!idxs.length) return;
    const cur = idxs.indexOf(selectedImg.value);
    selectedImg.value = cur === idxs.length - 1 ? idxs[0] : idxs[cur + 1];
  } else {
    selectedImg.value =
      selectedImg.value < mediaList.value.length - 1
        ? selectedImg.value + 1
        : 0;
  }
};

/* ----- 大图 ----- */
const showBigImg = ref(false);
const handleZoomClick = () => {
  showBigImg.value = true;
};
const handleCloseClick = () => {
  showBigImg.value = false;
};
const handleBackgroundClick = (e: MouseEvent) => {
  if (e.target === e.currentTarget) showBigImg.value = false;
};
const handleImageClick = (e: MouseEvent) => {
  e.stopPropagation();
};
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === "Escape" && showBigImg.value) showBigImg.value = false;
};

const currentImagePosition = computed(() => {
  if (!showBigImg.value) return { current: 0, total: 0 };
  const idxs = getImageIndexes();
  const cur = idxs.indexOf(selectedImg.value);
  return { current: cur >= 0 ? cur + 1 : 0, total: idxs.length };
});

onMounted(() => window.addEventListener("keydown", handleKeyDown));
onUnmounted(() => window.removeEventListener("keydown", handleKeyDown));

/* ----- 报警信息样式 ----- */
const getLevelColor = computed(() => {
  const lv = rowData.value?.level;
  if (lv === 1) return "#67c23a";
  if (lv === 2) return "#e6a23c";
  if (lv === 3) return "#f56c6c";
  return "#ffffff";
});
</script>

<template>
  <div class="alarm-img">
    <div class="alarm-img-item" v-if="rowData">
      <!-- 主图/视频 -->
      <img
        class="media-img"
        v-if="mediaList[selectedImg]?.type === 'img'"
        :src="mediaList[selectedImg].url"
        alt="报警图片"
      />
      <video
        v-if="mediaList[selectedImg]?.type === 'video' && videoConnectionBtn"
        class="media-img"
        :src="mediaList[selectedImg].url"
        controls
        preload="auto"
        autoplay
      />
      <div
        v-if="mediaList[selectedImg]?.type === 'video' && !videoConnectionBtn"
        class="video-placeholder"
      >
        <div class="placeholder-text">点击右上角图标开始播放</div>
      </div>

      <!-- 右上角工具栏：放大 / 视频控制 -->
      <div class="media-toolbar">
        <el-tooltip
          content="放大图片"
          placement="left"
          v-if="mediaList[selectedImg]?.type === 'img'"
        >
          <button class="tool-btn" @click="handleZoomClick">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>
        </el-tooltip>
        <el-tooltip
          :content="videoConnectionBtn ? '关闭视频' : '播放视频'"
          placement="left"
          v-if="mediaList[selectedImg]?.type === 'video'"
        >
          <button
            class="tool-btn"
            :class="{ 'tool-btn--active': videoConnectionBtn }"
            @click="videoConnectionBtn = !videoConnectionBtn"
          >
            <svg
              v-if="!videoConnectionBtn"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <svg
              v-else
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          </button>
        </el-tooltip>
      </div>

      <!-- 底部翻页导航 -->
      <div class="media-nav" v-if="mediaList.length > 1">
        <button class="nav-btn" @click="handleLeftArrowClick">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span class="nav-count"
          >{{ selectedImg + 1 }} / {{ mediaList.length }}</span
        >
        <button class="nav-btn" @click="handleRightArrowClick">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <!-- 报警信息叠加（左上角） -->
      <div class="alarm-info" v-if="rowData">
        <div class="alarm-info__title">
          {{ shipNameMap[rowData.devid] || "--" }} —
          {{ alarmTypeNameMap[rowData.alarmtype] || "--" }}
        </div>
        <div class="alarm-info__level" :style="{ color: getLevelColor }">
          {{
            rowData.level === 1
              ? "低风险"
              : rowData.level === 2
              ? "中风险"
              : rowData.level === 3
              ? "高风险"
              : "--"
          }}
        </div>
        <div class="alarm-info__row">UTC：{{ rowData.stime || "--" }}</div>
        <div class="alarm-info__row" v-if="rowData.lng != null">
          本地：{{ utcToLocalByLng(rowData.stime, rowData.lng) }}
        </div>
        <div class="alarm-info__row">
          {{ regionMap[rowData.region] || "--" }} ·
          {{ rowData.speed != null ? rowData.speed.toFixed(1) : "--" }} kn
        </div>
      </div>
    </div>
    <div class="no-data" v-else>请选择一条数据</div>
  </div>

  <!-- 全屏预览 -->
  <teleport to="body">
    <transition name="fade">
      <div class="lightbox" v-if="showBigImg" @click="handleBackgroundClick">
        <img
          :src="mediaList[selectedImg]?.url"
          alt=""
          @click="handleImageClick"
        />

        <!-- 底部导航 -->
        <div
          class="lightbox-nav"
          v-if="currentImagePosition.total > 1"
          @click.stop
        >
          <button class="nav-btn nav-btn--light" @click="handleLeftArrowClick">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span class="nav-count"
            >{{ currentImagePosition.current }} /
            {{ currentImagePosition.total }}</span
          >
          <button class="nav-btn nav-btn--light" @click="handleRightArrowClick">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        <!-- 关闭按钮 -->
        <button class="lightbox-close" @click.stop="handleCloseClick">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </transition>
  </teleport>
</template>

<style lang="scss" scoped>
.alarm-img {
  display: flex;
  align-items: stretch;
  width: 100%;
  height: 100%;
  min-height: 0;

  .alarm-img-item {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    background: var(--el-fill-color-dark);

    .media-img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .video-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      background: #111;

      .placeholder-text {
        font-size: 14px;
        color: rgb(255 255 255 / 50%);
        user-select: none;
      }
    }

    /* 右上角工具栏 */
    .media-toolbar {
      position: absolute;
      top: 10px;
      right: 10px;
      z-index: 10;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .tool-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      padding: 0;
      color: #fff;
      cursor: pointer;
      background: rgb(0 0 0 / 45%);
      backdrop-filter: blur(4px);
      border: 1px solid rgb(255 255 255 / 15%);
      border-radius: 6px;
      transition: background 0.2s;

      &:hover {
        background: rgb(0 0 0 / 70%);
      }

      &--active {
        background: rgb(64 158 255 / 60%);
        border-color: rgb(64 158 255 / 50%);
      }
    }

    /* 底部翻页导航 */
    .media-nav {
      position: absolute;
      bottom: 12px;
      left: 50%;
      z-index: 10;
      display: flex;
      gap: 8px;
      align-items: center;
      padding: 4px 10px;
      background: rgb(0 0 0 / 45%);
      backdrop-filter: blur(4px);
      border: 1px solid rgb(255 255 255 / 12%);
      border-radius: 20px;
      transform: translateX(-50%);
    }

    .nav-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      padding: 0;
      color: rgb(255 255 255 / 85%);
      cursor: pointer;
      background: transparent;
      border: none;
      border-radius: 4px;
      transition: color 0.2s, background 0.2s;

      &:hover {
        color: #fff;
        background: rgb(255 255 255 / 12%);
      }
    }

    .nav-count {
      min-width: 36px;
      font-size: 12px;
      font-weight: 500;
      color: rgb(255 255 255 / 90%);
      text-align: center;
      user-select: none;
    }

    /* 报警信息叠加 */
    .alarm-info {
      position: absolute;
      top: 12px;
      left: 14px;
      z-index: 10;
      padding: 6px 10px 8px;
      background: rgb(0 0 0 / 42%);
      backdrop-filter: blur(4px);
      border: 1px solid rgb(255 255 255 / 10%);
      border-radius: 8px;

      &__title {
        margin-bottom: 3px;
        font-size: 14px;
        font-weight: 600;
        color: #4dd9ff;
        text-shadow: 0 1px 4px rgb(0 0 0 / 80%);
      }

      &__level {
        margin-bottom: 3px;
        font-size: 13px;
        font-weight: 600;
        text-shadow: 0 1px 4px rgb(0 0 0 / 70%);
      }

      &__row {
        font-size: 12px;
        line-height: 1.6;
        color: rgb(255 255 255 / 88%);
        text-shadow: 0 1px 3px rgb(0 0 0 / 80%);
      }
    }
  }

  .no-data {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    font-size: 14px;
    color: var(--el-text-color-placeholder);
    user-select: none;
    background: var(--el-fill-color-lighter);
  }
}

/* 全屏预览 */
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(0 0 0 / 85%);
  backdrop-filter: blur(2px);

  img {
    max-width: 90vw;
    max-height: 88vh;
    user-select: none;
    object-fit: contain;
    border-radius: 6px;
    box-shadow: 0 8px 32px rgb(0 0 0 / 50%);
  }

  .lightbox-nav {
    position: absolute;
    bottom: 24px;
    left: 50%;
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 6px 16px;
    background: rgb(0 0 0 / 50%);
    backdrop-filter: blur(6px);
    border: 1px solid rgb(255 255 255 / 15%);
    border-radius: 24px;
    transform: translateX(-50%);
  }

  .nav-btn--light {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    color: rgb(255 255 255 / 80%);
    cursor: pointer;
    background: transparent;
    border: none;
    border-radius: 6px;
    transition: color 0.2s, background 0.2s;

    &:hover {
      color: #fff;
      background: rgb(255 255 255 / 15%);
    }
  }

  .nav-count {
    min-width: 44px;
    font-size: 13px;
    color: rgb(255 255 255 / 90%);
    text-align: center;
    user-select: none;
  }

  .lightbox-close {
    position: absolute;
    top: 20px;
    right: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    padding: 0;
    color: rgb(255 255 255 / 75%);
    cursor: pointer;
    background: rgb(0 0 0 / 40%);
    backdrop-filter: blur(4px);
    border: 1px solid rgb(255 255 255 / 15%);
    border-radius: 8px;
    transition: color 0.2s, background 0.2s;

    &:hover {
      color: #fff;
      background: rgb(0 0 0 / 65%);
    }
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
