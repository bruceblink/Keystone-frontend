import type { ComboxOption, ComboxRawItem, CameraForm } from "./types";

export const CAMERA_TYPE = "0";

export const STATUS_MAP: Record<string, string> = {
  "0": "离线",
  "1": "在线",
  "2": "故障",
  "3": "未知"
};

export type TagType = "primary" | "success" | "warning" | "danger" | "info";

export const STATUS_TAG_MAP: Record<string, TagType> = {
  "0": "danger",
  "1": "success",
  "2": "warning",
  "3": "info"
};

export const BRAND_MAP: Record<string, string> = {
  "0": "大华",
  "1": "海康",
  "2": "迈德威视",
  "3": "宇视",
  "4": "其他"
};

export const INFERENCE_MAP: Record<string, string> = {
  "0": "不推理",
  "1": "推理",
  "": " "
};

export function formatDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function genId(): string {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function parseTimeValue(timeStr: string): number {
  if (!timeStr) return 0;
  const parsed = Date.parse(timeStr.replace(/\//g, "-"));
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function getStatusText(status: string): string {
  return STATUS_MAP[status] ?? "未知";
}

export function getStatusTagType(status: string): TagType {
  return STATUS_TAG_MAP[status] ?? "info";
}

export function getBrandText(brand: string): string {
  return BRAND_MAP[brand] ?? "未知";
}

export function getInferenceText(value: string): string {
  const key = value != null ? String(value) : "";
  return INFERENCE_MAP[key] ?? "未知";
}

export function getComboxLabel(
  list: ComboxRawItem[],
  groupName: string,
  sort: string | number
): string {
  const item = list.find(
    row => row.name === groupName && String(row.sort) === String(sort)
  );
  return item?.item ? String(item.item) : String(sort || "未知");
}

export function getComboxOptions(
  list: ComboxRawItem[],
  groupName: string
): ComboxOption[] {
  return list
    .filter(row => row.name === groupName)
    .map(row => ({
      label: String(row.item ?? row.sort ?? ""),
      value: String(row.sort ?? "")
    }))
    .sort((a, b) => Number(a.value) - Number(b.value));
}

export function createEmptyCameraForm(): CameraForm {
  return {
    camid: "",
    devname: "",
    ipaddr: "",
    user: "",
    passwd: "",
    url: "",
    brand: "",
    type: CAMERA_TYPE,
    status: "1",
    areaid: "",
    areacode: "",
    sub_stream: "",
    inference: "0"
  };
}

export function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

export function isValidIp(value: string): boolean {
  if (!value) return true;
  return /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
    value
  );
}

export function isValidCamid(value: string): boolean {
  return /^[a-zA-Z0-9_]+$/.test(value);
}

export function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function matchComboxSort(
  list: ComboxRawItem[],
  groupName: string,
  rawValue: string
): string | null {
  const matched = list.find(
    row =>
      row.name === groupName &&
      (String(row.item) === rawValue || String(row.sort) === rawValue)
  );
  return matched ? String(matched.sort) : null;
}

export function getUniqueUuid(existingIds: Set<string>): string {
  let newId = genId();
  while (existingIds.has(newId)) {
    newId = genId();
  }
  existingIds.add(newId);
  return newId;
}
