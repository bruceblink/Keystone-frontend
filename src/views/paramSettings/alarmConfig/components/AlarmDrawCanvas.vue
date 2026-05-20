<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { PictureRounded } from "@element-plus/icons-vue";
import type { AreaItem, AreaPos } from "../utils/types";

interface DrawShape extends AreaItem {
  fromApi?: boolean;
}

const props = defineProps<{
  initialShapes?: AreaItem[];
  readonly?: boolean;
}>();

const canvasAreaRef = ref<HTMLDivElement | null>(null);
const drawingCanvas = ref<HTMLCanvasElement | null>(null);

const shapesFromApi = ref<DrawShape[]>([]);
const shapesTemp = ref<DrawShape[]>([]);
const allShapes = computed(() => [...shapesFromApi.value, ...shapesTemp.value]);

// 画布虚拟尺寸（坐标系基准）
const CANVAS_W = 800;
const CANVAS_H = 500;

type DrawTool = "line" | "polyline" | "rectangle" | "polygon" | null;
const currentTool = ref<DrawTool>(null);
const isDrawing = ref(false);
const startPoint = ref<AreaPos>({ x: 0, y: 0 });
const currentPoints = ref<AreaPos[]>([]);
const tempPreviewPoint = ref<AreaPos | null>(null);
let pendingShape: (DrawShape & { rawType: string }) | null = null;
let clickTimer: ReturnType<typeof setTimeout> | null = null;
let isHandlingDblClick = false;

const isEditMode = ref(false);
const selectedShapeIdx = ref(-1);
const selectedPointIdx = ref(-1);
const isDragging = ref(false);
const hoveredPoint = ref({ shapeIndex: -1, pointIndex: -1 });

const showNameDialog = ref(false);
const pendingShapeName = ref("");

const toolButtons = computed(() => [
  {
    id: "line",
    label: "直线",
    btnType: currentTool.value === "line" ? "warning" : "default"
  },
  {
    id: "polyline",
    label: "折线",
    btnType: currentTool.value === "polyline" ? "warning" : "default"
  },
  {
    id: "rectangle",
    label: "矩形",
    btnType: currentTool.value === "rectangle" ? "warning" : "default"
  },
  {
    id: "polygon",
    label: "多边形",
    btnType: currentTool.value === "polygon" ? "warning" : "default"
  },
  {
    id: "edit",
    label: isEditMode.value ? "退出编辑" : "编辑图形",
    btnType: isEditMode.value ? "danger" : "default"
  },
  { id: "undo", label: "撤销", btnType: "default" },
  { id: "clear", label: "清空", btnType: "danger" }
]);

const handleToolClick = (id: string) => {
  if (id === "clear") {
    clearAll();
    return;
  }
  if (id === "undo") {
    undoLast();
    return;
  }
  if (id === "edit") {
    isEditMode.value = !isEditMode.value;
    if (!isEditMode.value) resetEditState();
    resetDrawState();
    redraw();
    return;
  }
  if (isEditMode.value) {
    isEditMode.value = false;
    resetEditState();
  }
  resetDrawState();
  currentTool.value = id as DrawTool;
};

const clearAll = () => {
  ElMessageBox.confirm("确定清空所有图形吗？", "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning"
  })
    .then(() => {
      shapesFromApi.value = [];
      shapesTemp.value = [];
      resetDrawState();
      resetEditState();
      isEditMode.value = false;
      redraw();
    })
    .catch(() => {});
};

const undoLast = () => {
  if (shapesTemp.value.length > 0) {
    shapesTemp.value.pop();
    redraw();
  } else ElMessage.info("没有可撤销的未保存图形");
};

const getCanvasPos = (e: MouseEvent): AreaPos => {
  const canvas = drawingCanvas.value;
  if (!canvas) return { x: 0, y: 0 };
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.round(
      Math.min(
        Math.max(0, ((e.clientX - rect.left) * CANVAS_W) / rect.width),
        CANVAS_W
      )
    ),
    y: Math.round(
      Math.min(
        Math.max(0, ((e.clientY - rect.top) * CANVAS_H) / rect.height),
        CANVAS_H
      )
    )
  };
};

const CLICK_R = 8;
const getClickedPoint = (pos: AreaPos) => {
  for (let si = 0; si < allShapes.value.length; si++) {
    const s = allShapes.value[si];
    for (let pi = 0; pi < (s.areapos?.length ?? 0); pi++) {
      if (
        Math.hypot(pos.x - s.areapos[pi].x, pos.y - s.areapos[pi].y) <= CLICK_R
      )
        return { si, pi };
    }
  }
  return null;
};

const getHoveredInfo = (pos: AreaPos) => {
  for (let si = 0; si < allShapes.value.length; si++) {
    const s = allShapes.value[si];
    for (let pi = 0; pi < (s.areapos?.length ?? 0); pi++) {
      if (
        Math.hypot(pos.x - s.areapos[pi].x, pos.y - s.areapos[pi].y) <= CLICK_R
      )
        return { shapeIndex: si, pointIndex: pi };
    }
  }
  return { shapeIndex: -1, pointIndex: -1 };
};

const resetDrawState = () => {
  currentTool.value = null;
  isDrawing.value = false;
  startPoint.value = { x: 0, y: 0 };
  currentPoints.value = [];
  tempPreviewPoint.value = null;
  pendingShape = null;
  if (clickTimer) {
    clearTimeout(clickTimer);
    clickTimer = null;
  }
  isHandlingDblClick = false;
};

const resetEditState = () => {
  selectedShapeIdx.value = -1;
  selectedPointIdx.value = -1;
  hoveredPoint.value = { shapeIndex: -1, pointIndex: -1 };
  isDragging.value = false;
};

const onMouseDown = (e: MouseEvent) => {
  if (e.button !== 0 || props.readonly) return;
  const pos = getCanvasPos(e);
  if (isEditMode.value) {
    const hit = getClickedPoint(pos);
    if (hit) {
      selectedShapeIdx.value = hit.si;
      selectedPointIdx.value = hit.pi;
      isDragging.value = true;
    } else {
      selectedShapeIdx.value = -1;
      selectedPointIdx.value = -1;
    }
    redraw();
    return;
  }
  if (
    !["line", "rectangle", "polyline", "polygon"].includes(
      currentTool.value ?? ""
    )
  )
    return;
  if (isHandlingDblClick) {
    isHandlingDblClick = false;
    return;
  }
  if (clickTimer) {
    clearTimeout(clickTimer);
    clickTimer = null;
  }
  clickTimer = setTimeout(() => {
    if (isHandlingDblClick) {
      isHandlingDblClick = false;
      return;
    }
    if (currentTool.value === "polyline" || currentTool.value === "polygon") {
      if (!currentPoints.value.length) isDrawing.value = true;
      currentPoints.value.push({ ...pos });
      tempPreviewPoint.value = null;
      redraw();
    } else if (
      currentTool.value === "line" ||
      currentTool.value === "rectangle"
    ) {
      if (!isDrawing.value) {
        isDrawing.value = true;
        startPoint.value = { ...pos };
      } else finishLineOrRect(pos);
    }
    clickTimer = null;
  }, 300);
};

const onMouseMove = (e: MouseEvent) => {
  if (props.readonly) return;
  const pos = getCanvasPos(e);
  if (isEditMode.value) {
    hoveredPoint.value = getHoveredInfo(pos);
    if (
      isDragging.value &&
      selectedShapeIdx.value >= 0 &&
      selectedPointIdx.value >= 0
    ) {
      const s = allShapes.value[selectedShapeIdx.value];
      if (s?.areapos) {
        s.areapos[selectedPointIdx.value] = { ...pos };
        redraw();
        return;
      }
    }
    redraw();
    return;
  }
  if (
    !isDrawing.value &&
    currentTool.value !== "line" &&
    currentTool.value !== "rectangle"
  )
    return;
  if (currentTool.value === "polyline" || currentTool.value === "polygon") {
    if (currentPoints.value.length > 0) {
      tempPreviewPoint.value = pos;
      redraw();
    }
  } else if (
    (currentTool.value === "line" || currentTool.value === "rectangle") &&
    isDrawing.value
  ) {
    tempPreviewPoint.value = pos;
    redraw();
  }
};

const onMouseUp = () => {
  if (isEditMode.value && isDragging.value) {
    isDragging.value = false;
    return;
  }
  if (currentTool.value === "line" || currentTool.value === "rectangle") {
    tempPreviewPoint.value = null;
    redraw();
  }
};

const onDblClick = (e: MouseEvent) => {
  if (props.readonly) return;
  if (
    !isDrawing.value &&
    currentTool.value !== "polyline" &&
    currentTool.value !== "polygon"
  )
    return;
  if (clickTimer) {
    clearTimeout(clickTimer);
    clickTimer = null;
  }
  isHandlingDblClick = true;
  const pos = getCanvasPos(e);
  const tool = currentTool.value;
  if (
    (tool === "polygon" && currentPoints.value.length >= 3) ||
    (tool === "polyline" && currentPoints.value.length >= 2)
  ) {
    const last = currentPoints.value[currentPoints.value.length - 1];
    if (!last || Math.hypot(last.x - pos.x, last.y - pos.y) >= 5)
      currentPoints.value.push({ ...pos });
    pendingShape = {
      type: tool === "polygon" ? "Polygon" : "Polyline",
      name: "",
      areapos: currentPoints.value.map(p => ({
        x: Math.round(p.x),
        y: Math.round(p.y)
      })),
      rawType: tool
    };
    currentPoints.value = [];
    isDrawing.value = false;
    tempPreviewPoint.value = null;
    showNameDialog.value = true;
    setTimeout(() => {
      isHandlingDblClick = false;
    }, 100);
  } else isHandlingDblClick = false;
};

const onRightClick = (_e: MouseEvent) => {
  if (props.readonly) return;
  if (!["polyline", "polygon"].includes(currentTool.value ?? "")) return;
  if (currentPoints.value.length > 1) {
    currentPoints.value.pop();
    tempPreviewPoint.value = null;
    redraw();
  } else if (currentPoints.value.length === 1) {
    currentPoints.value = [];
    isDrawing.value = false;
    tempPreviewPoint.value = null;
    redraw();
  }
};

const finishLineOrRect = (endPos: AreaPos) => {
  const tool = currentTool.value;
  let areapos: AreaPos[] = [];
  let typeStr = "";
  if (tool === "line") {
    typeStr = "Line";
    areapos = [
      { x: Math.round(startPoint.value.x), y: Math.round(startPoint.value.y) },
      { x: Math.round(endPos.x), y: Math.round(endPos.y) }
    ];
  } else if (tool === "rectangle") {
    typeStr = "Rectangle";
    const [x0, y0, x1, y1] = [
      Math.round(startPoint.value.x),
      Math.round(startPoint.value.y),
      Math.round(endPos.x),
      Math.round(endPos.y)
    ];
    areapos = [
      { x: x0, y: y0 },
      { x: x1, y: y0 },
      { x: x1, y: y1 },
      { x: x0, y: y1 }
    ];
  }
  pendingShape = { type: typeStr, name: "", areapos, rawType: tool ?? "" };
  isDrawing.value = false;
  tempPreviewPoint.value = null;
  showNameDialog.value = true;
};

const confirmShape = () => {
  if (!pendingShapeName.value.trim()) {
    ElMessage.warning("请输入图形名称");
    return;
  }
  if (!pendingShape) {
    ElMessage.warning("没有可保存的图形");
    return;
  }
  shapesTemp.value.push({
    ...pendingShape,
    name: pendingShapeName.value.trim()
  });
  showNameDialog.value = false;
  pendingShapeName.value = "";
  pendingShape = null;
  redraw();
};

const cancelShape = () => {
  showNameDialog.value = false;
  pendingShapeName.value = "";
  pendingShape = null;
  resetDrawState();
  redraw();
};

// ========== 绘制 ==========
const SHAPE_COLOR = "#409eff";
const SHAPE_COLOR_EDITING = "#f56c6c";

const redraw = () => {
  const canvas = drawingCanvas.value;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // 浅色背景 + 网格
  ctx.fillStyle = "#f5f7fa";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.strokeStyle = "rgba(0,0,0,0.06)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= CANVAS_W; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_H);
    ctx.stroke();
  }
  for (let y = 0; y <= CANVAS_H; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_W, y);
    ctx.stroke();
  }

  // 已保存图形
  allShapes.value.forEach((shape, si) => {
    if (!shape.areapos?.length) return;
    const color = isEditMode.value ? SHAPE_COLOR_EDITING : SHAPE_COLOR;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.moveTo(shape.areapos[0].x, shape.areapos[0].y);
    shape.areapos.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
    if (shape.type === "Polygon" || shape.type === "Rectangle") ctx.closePath();
    ctx.stroke();
    // 填充半透明
    if (
      shape.areapos.length >= 3 &&
      (shape.type === "Polygon" || shape.type === "Rectangle")
    ) {
      ctx.fillStyle = isEditMode.value
        ? "rgba(245,108,108,0.08)"
        : "rgba(64,158,255,0.08)";
      ctx.fill();
    }
    // 名称标签
    if (shape.name) {
      ctx.font = "bold 13px Arial";
      ctx.fillStyle = color;
      ctx.fillText(shape.name, shape.areapos[0].x + 4, shape.areapos[0].y - 5);
    }
    // 编辑控制点
    if (isEditMode.value) {
      shape.areapos.forEach((p, pi) => {
        const isSel =
          selectedShapeIdx.value === si && selectedPointIdx.value === pi;
        const isHov =
          hoveredPoint.value.shapeIndex === si &&
          hoveredPoint.value.pointIndex === pi;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = isSel ? "#f56c6c" : isHov ? "#e6a23c" : "#fff";
        ctx.strokeStyle = isSel ? "#fff" : "#f56c6c";
        ctx.lineWidth = isSel ? 2 : 1;
        ctx.fill();
        ctx.stroke();
      });
    }
  });

  // 绘制中预览
  const preview = tempPreviewPoint.value;
  if (
    (currentTool.value === "polyline" || currentTool.value === "polygon") &&
    currentPoints.value.length > 0
  ) {
    const pts = preview
      ? [...currentPoints.value, preview]
      : currentPoints.value;
    if (pts.length >= 2) {
      ctx.beginPath();
      ctx.strokeStyle = SHAPE_COLOR;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.moveTo(pts[0].x, pts[0].y);
      pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
      if (currentTool.value === "polygon" && pts.length >= 3) ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
    }
    currentPoints.value.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = SHAPE_COLOR;
      ctx.fill();
    });
  } else if (
    (currentTool.value === "line" || currentTool.value === "rectangle") &&
    isDrawing.value &&
    preview
  ) {
    ctx.beginPath();
    ctx.strokeStyle = SHAPE_COLOR;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    if (currentTool.value === "line") {
      ctx.moveTo(startPoint.value.x, startPoint.value.y);
      ctx.lineTo(preview.x, preview.y);
    } else {
      ctx.strokeRect(
        startPoint.value.x,
        startPoint.value.y,
        preview.x - startPoint.value.x,
        preview.y - startPoint.value.y
      );
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }
};

// ========== 生命周期 ==========
let ro: ResizeObserver | null = null;

onMounted(() => {
  nextTick(() => {
    const canvas = drawingCanvas.value;
    if (canvas) {
      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;
    }
    redraw();
    if (canvasAreaRef.value) {
      ro = new ResizeObserver(() => redraw());
      ro.observe(canvasAreaRef.value);
    }
  });
});

onUnmounted(() => {
  ro?.disconnect();
  ro = null;
  if (clickTimer) clearTimeout(clickTimer);
});

watch(
  () => props.initialShapes,
  shapes => {
    shapesFromApi.value = shapes
      ? shapes.map(s => ({ ...s, fromApi: true }))
      : [];
    shapesTemp.value = [];
    resetDrawState();
    resetEditState();
    isEditMode.value = false;
    nextTick(redraw);
  },
  { immediate: true, deep: true }
);

// ========== 暴露 ==========
const getShapes = () =>
  allShapes.value.map(s => ({
    request: "alarm_area",
    areatype: "0",
    type: s.type,
    name: s.name,
    areapos: s.areapos.map(p => ({ x: Math.round(p.x), y: Math.round(p.y) }))
  }));

const resetShapes = (shapes: AreaItem[]) => {
  shapesFromApi.value = shapes.map(s => ({ ...s, fromApi: true }));
  shapesTemp.value = [];
  resetDrawState();
  resetEditState();
  isEditMode.value = false;
  nextTick(redraw);
};

defineExpose({ getShapes, resetShapes });
</script>

<template>
  <div class="flex flex-col h-full min-h-0 overflow-hidden gap-2">
    <!-- 工具栏 -->
    <div
      class="flex items-center justify-between flex-wrap gap-2 py-2 px-3 bg-[var(--el-bg-color)] border border-[var(--el-border-color-lighter)] rounded-lg shrink-0"
    >
      <div class="flex flex-wrap gap-[6px]" v-if="!readonly">
        <el-button
          v-for="btn in toolButtons"
          :key="btn.id"
          :type="btn.btnType as any"
          size="small"
          @click="handleToolClick(btn.id)"
        >
          {{ btn.label }}
        </el-button>
      </div>
      <span v-else class="text-xs text-[var(--el-text-color-placeholder)]"
        >只读预览</span
      >
      <slot name="save-btn" />
    </div>

    <!-- 画布区域 -->
    <div
      class="flex-1 min-h-0 relative border border-[var(--el-border-color-lighter)] rounded-lg overflow-hidden bg-[#f5f7fa]"
      ref="canvasAreaRef"
    >
      <canvas
        ref="drawingCanvas"
        class="block w-full h-full object-contain"
        :class="{
          'cursor-crosshair': !readonly && currentTool && !isEditMode,
          'cursor-default': isEditMode
        }"
        @mousedown="onMouseDown"
        @mousemove="onMouseMove"
        @mouseup="onMouseUp"
        @dblclick="onDblClick"
        @contextmenu.prevent="onRightClick"
      />
      <div
        v-if="!allShapes.length && !isDrawing"
        class="absolute inset-0 flex flex-col items-center justify-center gap-[10px] text-[var(--el-text-color-placeholder)] text-[13px] pointer-events-none"
      >
        <el-icon :size="32" class="!text-[var(--el-border-color)]"
          ><PictureRounded
        /></el-icon>
        <span>{{
          readonly ? "暂无配置区域" : "请选择绘图工具后在此绘制检测区域"
        }}</span>
      </div>
    </div>

    <!-- 图形命名弹窗 -->
    <el-dialog
      v-model="showNameDialog"
      title="图形命名"
      width="360px"
      :close-on-click-modal="false"
      align-center
    >
      <el-input
        v-model="pendingShapeName"
        placeholder="请输入图形名称"
        @keyup.enter="confirmShape"
        autofocus
      />
      <template #footer>
        <el-button @click="cancelShape">取消</el-button>
        <el-button type="primary" @click="confirmShape">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>
