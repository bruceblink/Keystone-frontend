/**
 * 电子围栏模块 - 常量与 Mock 数据
 */
import type { FenceItem } from "./types";

/** 所属水域字典类型（/device/dictionaries/items 的 dictType 参数） */
export const AREA_TYPE_COMBOX_NAME = "所属水域";

export const DATA_TYPE_MAP: Record<string, string> = {
  "0": "区域",
  "1": "点",
  "2": "线"
};

export function formatPoints(data: { lng: number; lat: number }[]): string {
  if (!data || !data.length) return "-";
  return data.map(p => `(${p.lng}, ${p.lat})`).join("; ");
}

export function genId(): string {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function formatDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export const MOCK_FENCES: FenceItem[] = [
  {
    sid: "f001",
    areatype: "4",
    name: "长江禁航区A",
    datatype: "0",
    data: [
      { lng: 121.1, lat: 31.2 },
      { lng: 121.3, lat: 31.2 },
      { lng: 121.3, lat: 31.4 }
    ],
    user: "admin",
    create_time: "2026/3/1 09:00:00"
  },
  {
    sid: "f002",
    areatype: "2",
    name: "东海沿海监控点",
    datatype: "1",
    data: [{ lng: 122.5, lat: 30.8 }],
    user: "admin",
    create_time: "2026/3/15 10:30:00"
  },
  {
    sid: "f003",
    areatype: "5",
    name: "港口限速航道",
    datatype: "2",
    data: [
      { lng: 121.4, lat: 31.0 },
      { lng: 121.6, lat: 31.1 }
    ],
    user: "admin",
    create_time: "2026/4/10 14:00:00"
  }
];
