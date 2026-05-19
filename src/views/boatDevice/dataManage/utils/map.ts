/**
 * useDraggableMap
 * 高德地图（AMap JS API v2）可拖动 / 可缩放浮动面板 composable
 *
 * 生命周期由内部自动管理（onBeforeUnmount），
 * 调用方无需手动调用 destroy()。
 */
import { ref, nextTick, onBeforeUnmount } from "vue";

/* ------------------------------------------------------------------ */
/* 类型声明                                                             */
/* ------------------------------------------------------------------ */

declare global {
  interface Window {
    AMap: any;
  }
}

export interface UseDraggableMapOptions {
  /** 面板初始宽度，默认 520 */
  initW?: number;
  /** 面板初始高度，默认 400 */
  initH?: number;
  /** 面板最小宽度，默认 320 */
  minW?: number;
  /** 面板最小高度，默认 240 */
  minH?: number;
  /** 地图初始缩放级别，默认 10 */
  zoom?: number;
  /** 地图初始中心点 [lng, lat]，默认上海 */
  center?: [number, number];
  /** 高德地图主题 URI */
  mapStyle?: string;
  /** 传递给 AMap.Map 构造函数的额外参数 */
  extraMapOptions?: Record<string, unknown>;
}

export interface AlarmItem {
  lng: number | null;
  lat: number | null;
  level?: number;
  devid?: string;
  alarmtype?: number;
  stime?: string;
}

export interface FencePoint {
  lng: number | null;
  lat: number | null;
}

export interface FenceItem {
  data: FencePoint[];
  name?: string;
  areatype?: string | number;
}

interface AreaStyle {
  stroke: string;
  fill: string;
  label: string;
}

/* ------------------------------------------------------------------ */
/* 模块级常量（仅初始化一次）                                           */
/* ------------------------------------------------------------------ */

const AREA_CONFIG: Record<string, AreaStyle> = {
  "0": { stroke: "#8c8c8c", fill: "#8c8c8c", label: "普通区域" },
  "1": { stroke: "#36cfc9", fill: "#36cfc9", label: "恶劣天气区域" },
  "2": { stroke: "#722ed1", fill: "#722ed1", label: "特战区" },
  "3": { stroke: "#13c2c2", fill: "#13c2c2", label: "六区一线" },
  "4": { stroke: "#FF4D4F", fill: "#FF4D4F", label: "海盗区" },
  "5": { stroke: "#52C41A", fill: "#52C41A", label: "港界" },
  "6": { stroke: "#1890FF", fill: "#1890FF", label: "狭水道" },
  "7": { stroke: "#73d13d", fill: "#73d13d", label: "靠泊" },
  "8": { stroke: "#ffa940", fill: "#ffa940", label: "港口" },
  "9": { stroke: "#fadb14", fill: "#fadb14", label: "复杂水域" },
  "10": { stroke: "#bfbfbf", fill: "#bfbfbf", label: "未知区域" },
  "11": { stroke: "#fa8c16", fill: "#fa8c16", label: "密集海域" },
  "12": { stroke: "#eb2f96", fill: "#eb2f96", label: "AIS密集区域" },
  "13": { stroke: "#ff7a45", fill: "#ff7a45", label: "中国领海" },
  "14": { stroke: "#9254de", fill: "#9254de", label: "沿海商渔碰撞高风险区" }
};

let stylesInjected = false;

/* ------------------------------------------------------------------ */
/* 纯工具函数                                                           */
/* ------------------------------------------------------------------ */

/** 十进制度 → 度分秒字符串，如 103°41'7.86"E */
function toDMS(deg: number, isLat: boolean): string {
  const abs = Math.abs(deg);
  const d = Math.floor(abs);
  const mF = (abs - d) * 60;
  const m = Math.floor(mF);
  const s = ((mF - m) * 60).toFixed(2);
  const dir = isLat ? (deg >= 0 ? "N" : "S") : deg >= 0 ? "E" : "W";
  return `${d}°${m}'${s}"${dir}`;
}

/** 报警等级 → 主题色 */
function levelColor(level?: number): string {
  if (level === 3) return "#ef4444";
  if (level === 2) return "#f97316";
  return "#3b82f6";
}

/** areatype → 颜色配置 */
function areaStyle(areatype?: string | number): AreaStyle {
  return (
    AREA_CONFIG[String(areatype)] ?? {
      stroke: "#1fd6ff",
      fill: "#1fd6ff",
      label: ""
    }
  );
}

/** 计算多边形路径的算术重心 */
function centroid(path: [number, number][]): [number, number] {
  const n = path.length;
  return [
    path.reduce((s, p) => s + p[0], 0) / n,
    path.reduce((s, p) => s + p[1], 0) / n
  ];
}

/** 向 <head> 注入地图自定义 CSS（全局仅执行一次） */
function injectMapStyles(): void {
  if (stylesInjected) return;
  stylesInjected = true;

  const el = document.createElement("style");
  el.dataset.owner = "useDraggableMap";
  el.textContent = /* css */ `
    .am-hl { position:relative; width:24px; height:24px; cursor:pointer; }
    .am-hl__dot {
      position:absolute; top:50%; left:50%;
      transform:translate(-50%,-50%);
      width:12px; height:12px; border-radius:50%; z-index:1;
    }
    .am-hl__ring {
      position:absolute; top:50%; left:50%;
      transform:translate(-50%,-50%);
      width:12px; height:12px; border-radius:50%; border:2px solid;
      opacity:0; animation:am-hl-pulse 2s ease-out infinite;
    }
    .am-hl__ring--2 { animation-delay:.65s; }
    .am-hl__ring--3 { animation-delay:1.3s; }
    @keyframes am-hl-pulse {
      0%   { width:12px; height:12px; opacity:.9; }
      100% { width:52px; height:52px; opacity:0; }
    }
    .amap-info-content { padding:0!important; border:none!important; background:transparent!important; box-shadow:none!important; }
    .amap-info-outer   { background:transparent!important; box-shadow:none!important; border:none!important; }
    .amap-info-sharp   { display:none!important; }
    .am-popup {
      padding:10px 14px; min-width:220px; border-radius:8px;
      border-left:3px solid;
      border-top:1px solid rgba(255,255,255,.1);
      border-right:1px solid rgba(255,255,255,.06);
      border-bottom:1px solid rgba(255,255,255,.06);
      background:rgba(6,18,52,.94); backdrop-filter:blur(12px);
      box-shadow:0 8px 28px rgba(0,0,0,.45);
      font-family:-apple-system,"Segoe UI",sans-serif;
    }
    .am-popup__title {
      margin-bottom:6px; padding-bottom:6px;
      border-bottom:1px solid rgba(82,188,255,.15);
      font-size:14px; font-weight:700; color:#e8f4ff; line-height:1.4;
    }
    .am-popup__row { display:flex; gap:6px; align-items:baseline; font-size:12px; color:#c8e4f8; line-height:1.85; }
    .am-popup__lbl { color:rgba(160,200,240,.6); white-space:nowrap; flex-shrink:0; }
    .am-popup__val { font-weight:500; }
  `;
  document.head.appendChild(el);
}

/* ------------------------------------------------------------------ */
/* composable                                                           */
/* ------------------------------------------------------------------ */

export function useDraggableMap(options: UseDraggableMapOptions = {}) {
  const {
    initW = 520,
    initH = 400,
    minW = 320,
    minH = 240,
    zoom = 10,
    center = [121.47, 31.23] as [number, number],
    mapStyle = "amap://styles/blue",
    extraMapOptions = {}
  } = options;

  /* ---------- 响应式状态 ---------- */
  const mapVisible = ref(false);
  const mapRef = ref<HTMLElement | null>(null);
  const mapInstance = ref<any>(null);
  const mapPos = ref({ x: 0, y: 0 });
  const mapSize = ref({ w: initW, h: initH });
  const isDragging = ref(false);
  const isResizing = ref(false);

  /* ---------- 私有变量 ---------- */
  let dragOffset = { x: 0, y: 0 };
  let resizeStart = { x: 0, y: 0, w: 0, h: 0 };
  let hlMarker: any = null;
  let hlInfoWindow: any = null;
  let centerTimer: ReturnType<typeof setTimeout> | null = null;
  let fenceOverlays: any[] = [];

  /* ---- 位置初始化 ---- */
  function initPos(): void {
    mapPos.value = {
      x: Math.max(0, window.innerWidth - mapSize.value.w - 20),
      y: 80
    };
  }

  /* ---- 地图实例 ---- */

  function initMap(): void {
    if (!mapRef.value || mapInstance.value) return;
    if (!window.AMap) {
      console.warn(
        "[useDraggableMap] window.AMap 未就绪，请确认已引入高德 JS API v2"
      );
      return;
    }
    mapInstance.value = new window.AMap.Map(mapRef.value, {
      zoom,
      center,
      mapStyle,
      resizeEnable: true,
      ...extraMapOptions
    });
  }

  function toggleMap(): void {
    if (!mapVisible.value) {
      initPos();
      mapVisible.value = true;
      nextTick(() => initMap());
    } else {
      mapVisible.value = false;
    }
  }

  /* ---- 拖动 ---- */

  function onDragMove(e: MouseEvent): void {
    if (!isDragging.value) return;
    mapPos.value = {
      x: Math.max(
        0,
        Math.min(window.innerWidth - mapSize.value.w, e.clientX - dragOffset.x)
      ),
      y: Math.max(
        0,
        Math.min(window.innerHeight - 60, e.clientY - dragOffset.y)
      )
    };
  }

  function onDragEnd(): void {
    isDragging.value = false;
    document.removeEventListener("mousemove", onDragMove);
    document.removeEventListener("mouseup", onDragEnd);
  }

  function onDragStart(e: MouseEvent): void {
    const t = e.target as HTMLElement;
    if (t.closest(".map-panel__close") || t.closest(".map-panel__resize"))
      return;
    isDragging.value = true;
    dragOffset = {
      x: e.clientX - mapPos.value.x,
      y: e.clientY - mapPos.value.y
    };
    document.addEventListener("mousemove", onDragMove);
    document.addEventListener("mouseup", onDragEnd);
    e.preventDefault();
  }

  /* ---- 调整大小 ---- */

  function onResizeMove(e: MouseEvent): void {
    if (!isResizing.value) return;
    mapSize.value = {
      w: Math.max(minW, resizeStart.w + e.clientX - resizeStart.x),
      h: Math.max(minH, resizeStart.h + e.clientY - resizeStart.y)
    };
    mapInstance.value?.resize();
  }

  function onResizeEnd(): void {
    isResizing.value = false;
    document.removeEventListener("mousemove", onResizeMove);
    document.removeEventListener("mouseup", onResizeEnd);
    if (hlMarker) {
      const pos = hlMarker.getPosition();
      if (pos) {
        mapInstance.value?.resize();
        setTimeout(() => mapInstance.value?.setCenter([pos.lng, pos.lat]), 50);
      }
    }
  }

  function onResizeStart(e: MouseEvent): void {
    isResizing.value = true;
    resizeStart = {
      x: e.clientX,
      y: e.clientY,
      w: mapSize.value.w,
      h: mapSize.value.h
    };
    document.addEventListener("mousemove", onResizeMove);
    document.addEventListener("mouseup", onResizeEnd);
    e.preventDefault();
    e.stopPropagation();
  }

  /* ---- 高亮标记 ---- */

  function highlightAlarmMarker(
    item: AlarmItem,
    shipNameMap: Record<string, string> = {},
    alarmTypeNameMap: Record<number, string> = {}
  ): void {
    if (!mapInstance.value || !window.AMap) return;
    if (item.lng == null || item.lat == null) return;

    injectMapStyles();

    if (hlMarker) {
      mapInstance.value.remove(hlMarker);
      hlMarker = null;
    }
    hlInfoWindow?.close();

    const lng = Number(item.lng);
    const lat = Number(item.lat);
    const color = levelColor(item.level);
    const ship =
      (item.devid ? shipNameMap[item.devid] : undefined) ?? item.devid ?? "--";
    const alarm =
      (item.alarmtype != null ? alarmTypeNameMap[item.alarmtype] : undefined) ??
      String(item.alarmtype ?? "--");

    hlMarker = new window.AMap.Marker({
      position: [lng, lat],
      zIndex: 200,
      offset: new window.AMap.Pixel(-12, -12),
      content: `<div class="am-hl">
        <div class="am-hl__dot"    style="background:${color};box-shadow:0 0 8px ${color}80"></div>
        <div class="am-hl__ring"   style="border-color:${color}"></div>
        <div class="am-hl__ring am-hl__ring--2" style="border-color:${color}"></div>
        <div class="am-hl__ring am-hl__ring--3" style="border-color:${color}"></div>
      </div>`
    });

    hlInfoWindow = new window.AMap.InfoWindow({
      anchor: "bottom-center",
      offset: new window.AMap.Pixel(0, -24),
      closeWhenClickMap: true,
      content: `<div class="am-popup" style="border-left-color:${color}">
        <div class="am-popup__title" style="color:${color}">${ship} — ${alarm}</div>
        <div class="am-popup__row"><span class="am-popup__lbl">经度：</span><span class="am-popup__val">${toDMS(
          lng,
          false
        )}</span></div>
        <div class="am-popup__row"><span class="am-popup__lbl">纬度：</span><span class="am-popup__val">${toDMS(
          lat,
          true
        )}</span></div>
        <div class="am-popup__row"><span class="am-popup__lbl">时间：</span><span class="am-popup__val">${
          item.stime ?? "--"
        }</span></div>
      </div>`
    });

    if (centerTimer) {
      clearTimeout(centerTimer);
      centerTimer = null;
    }

    mapInstance.value.add(hlMarker);
    hlMarker.on("click", () =>
      hlInfoWindow.open(mapInstance.value, [lng, lat])
    );

    // setZoomAndCenter 动画完成后精确弹窗，兜底 600 ms
    let fired = false;
    const onMoveEnd = () => {
      if (fired) return;
      fired = true;
      clearTimeout(centerTimer!);
      centerTimer = null;
      mapInstance.value.off("moveend", onMoveEnd);
      mapInstance.value.setCenter([lng, lat]);
      hlInfoWindow.open(mapInstance.value, [lng, lat]);
    };
    mapInstance.value.on("moveend", onMoveEnd);
    centerTimer = setTimeout(() => {
      centerTimer = null;
      onMoveEnd();
    }, 600);
    mapInstance.value.setZoomAndCenter(5, [lng, lat]);
  }

  function clearHighlight(): void {
    if (centerTimer) {
      clearTimeout(centerTimer);
      centerTimer = null;
    }
    if (hlMarker) {
      mapInstance.value?.remove(hlMarker);
      hlMarker = null;
    }
    hlInfoWindow?.close();
    hlInfoWindow = null;
  }

  /* ---- 电子围栏 ---- */

  function clearFences(): void {
    if (fenceOverlays.length) mapInstance.value?.remove(fenceOverlays);
    fenceOverlays = [];
  }

  function drawFences(fenceList: FenceItem[]): void {
    if (!mapInstance.value || !window.AMap || !fenceList.length) return;
    clearFences();

    for (const fence of fenceList) {
      const path = (fence.data ?? [])
        .filter(p => p.lng != null && p.lat != null)
        .map(p => [Number(p.lng), Number(p.lat)] as [number, number]);

      if (path.length < 3) continue;

      const cfg = areaStyle(fence.areatype);
      const polygon = new window.AMap.Polygon({
        path,
        strokeColor: cfg.stroke,
        strokeWeight: 2,
        strokeOpacity: 0.85,
        fillColor: cfg.fill,
        fillOpacity: 0.18,
        zIndex: 10
      });
      mapInstance.value.add(polygon);
      fenceOverlays.push(polygon);

      const label = fence.name || cfg.label;
      if (label) {
        const [cx, cy] = centroid(path);
        const lm = new window.AMap.Marker({
          position: [cx, cy],
          zIndex: 11,
          offset: new window.AMap.Pixel(-40, -16),
          content: `<div style="padding:4px 9px;border-radius:5px;white-space:nowrap;pointer-events:none;
            background:rgba(4,14,38,.82);color:${cfg.stroke};border:1px solid ${cfg.stroke}55;
            backdrop-filter:blur(4px);line-height:1.4;font-size:11px;font-weight:700">${label}</div>`
        });
        mapInstance.value.add(lm);
        fenceOverlays.push(lm);
      }
    }
  }

  /* ---- 生命周期：在 DOM 移除前销毁地图实例 ---- */

  onBeforeUnmount(() => {
    try {
      mapInstance.value?.destroy();
    } catch {
      /* AMap 在容器已离开 DOM 时可能抛出 */
    }
    mapInstance.value = null;
    document.removeEventListener("mousemove", onDragMove);
    document.removeEventListener("mouseup", onDragEnd);
    document.removeEventListener("mousemove", onResizeMove);
    document.removeEventListener("mouseup", onResizeEnd);
  });

  /* ---- 返回公开 API ---- */

  return {
    mapVisible,
    mapRef,
    mapInstance,
    mapPos,
    mapSize,
    isDragging,
    isResizing,
    toggleMap,
    initMap,
    onDragStart,
    onResizeStart,
    highlightAlarmMarker,
    clearHighlight,
    drawFences,
    clearFences
  };
}
