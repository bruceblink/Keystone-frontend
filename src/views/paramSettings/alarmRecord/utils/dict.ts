export const ALARM_STATUS_OPTIONS = [
  { label: "全部", value: -1 },
  { label: "未处理", value: 0 },
  { label: "已处理", value: 1 },
  { label: "已作废", value: 2 }
] as const;

export const ALARM_STATE_MAP: Record<number, string> = {
  0: "未处理",
  1: "已处理",
  2: "已作废"
};

export const ALARM_LEVEL_MAP: Record<string, string> = {
  "1": "一级",
  "2": "二级",
  "3": "三级"
};

export function getDutyLevelText(
  level: string | number | null | undefined
): string {
  if (level == null || level === "") return "—";
  return ALARM_LEVEL_MAP[String(level)] ?? String(level);
}

export function formatCoord(val: string | number | null | undefined): string {
  if (val == null || val === "") return "—";
  const n = Number(val);
  if (Number.isNaN(n)) return String(val);
  return n === 0 ? "0" : n.toFixed(6);
}
