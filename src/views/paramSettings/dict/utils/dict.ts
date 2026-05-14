/**
 * 数据字典模块 - 工具函数与 Mock 数据
 */
import type { DictItem } from "./types";

export function formatDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function genId(): string {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getValueType(v: string): string {
  if (v === "") return "";
  if (!isNaN(Number(v))) return "Number";
  if (v.toLowerCase() === "true" || v.toLowerCase() === "false")
    return "Boolean";
  if (!isNaN(Date.parse(v))) return "Date";
  try {
    JSON.parse(v);
    return "JSON";
  } catch {
    return "String";
  }
}

export const MOCK_DICTS: DictItem[] = [
  {
    _id: "d001",
    name: "system.title",
    value: "船舶管理平台",
    dataType: "String",
    description: "系统标题",
    user: "admin",
    createdTime: "2026/1/1 08:00:00"
  },
  {
    _id: "d002",
    name: "system.version",
    value: "1.0.0",
    dataType: "String",
    description: "系统版本号",
    user: "admin",
    createdTime: "2026/1/1 08:01:00"
  },
  {
    _id: "d003",
    name: "alarm.threshold",
    value: "80",
    dataType: "Number",
    description: "告警阈值（百分比）",
    user: "admin",
    createdTime: "2026/2/10 10:00:00"
  },
  {
    _id: "d004",
    name: "fence.enable",
    value: "true",
    dataType: "Boolean",
    description: "是否启用电子围栏",
    user: "admin",
    createdTime: "2026/3/5 09:30:00"
  },
  {
    _id: "d005",
    name: "upload.maxSize",
    value: "104857600",
    dataType: "Number",
    description: "上传文件最大字节数（100MB）",
    user: "admin",
    createdTime: "2026/3/20 14:00:00"
  }
];
