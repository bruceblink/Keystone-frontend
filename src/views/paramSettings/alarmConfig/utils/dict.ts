import type {
  AlarmConfigTypeItem,
  AlarmConfigRecord,
  ExtParam,
  AreaItem
} from "./types";
import type {
  AlarmConditionDTO,
  ReasonOpsDTO
} from "@/api/paramSettings/alarmConfig";
import type { ReasonTypeListItemDTO } from "@/api/paramSettings/alarmType";

export function genId(): string {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function formatDateTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(
    d.getHours()
  )}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

const toFlag = (v: string | number | undefined) =>
  String(v) === "1" || v === 1 ? "1" : "0";

/**
 * 将原因类型（算法任务）接口项转为列表展示结构
 */
export const normalizeAlarmConfigType = (
  item: ReasonTypeListItemDTO
): AlarmConfigTypeItem => ({
  _id: String(item._id ?? genId()),
  id: String(item.id ?? item.alarmid ?? ""),
  des: item.des ?? "",
  visibility: toFlag(item.visibility),
  create_time: item.create_time ?? "",
  update_time: item.create_time ?? item.updated_at ?? ""
});

/**
 * 将报警参数接口项转为页面记录结构
 */
export const normalizeAlarmConfigRecord = (
  item: AlarmConditionDTO
): AlarmConfigRecord => ({
  _id: String(item._id ?? genId()),
  sid: String(item.sid ?? ""),
  camid: String(item.camid ?? ""),
  alarmtype: String(item.alarmtype ?? item.alarmid ?? ""),
  devid: String(item.devid ?? ""),
  ext1: String(item.ext1 ?? ""),
  ext2: String(item.ext2 ?? ""),
  ext3: String(item.ext3 ?? ""),
  ext4: String(item.ext4 ?? ""),
  ext5: String(item.ext5 ?? ""),
  ext6: String(item.ext6 ?? ""),
  ext7: String(item.ext7 ?? ""),
  ext8: String(item.ext8 ?? ""),
  area: (Array.isArray(item.area) ? item.area : []) as AreaItem[],
  create_time: String(item.create_time ?? "")
});

/**
 * 格式化列表展示时间（兼容时间戳与字符串）
 */
export function formatConfigTime(val: unknown): string {
  if (val == null || val === "") return "";
  const num = Number(val);
  let d: Date;
  if (!Number.isNaN(num) && String(val).trim() !== "") {
    d = new Date(num > 9999999999 ? num : num * 1000);
  } else {
    d = new Date(String(val));
  }
  if (Number.isNaN(d.getTime())) return String(val);
  return formatDateTime(d);
}

/**
 * 将 reason/ops 接口数据转为 ext 参数表单项
 */
export function reasonOpsToExtParams(
  reason: ReasonOpsDTO | undefined
): ExtParam[] {
  if (!reason) return [];
  const params: ExtParam[] = [];
  for (let i = 1; i <= 8; i++) {
    const nameKey = `ext${i}_name`;
    const desKey = `ext${i}_des`;
    const valueKey = `ext${i}`;
    if (reason[nameKey]) {
      params.push({
        key: valueKey,
        name: String(reason[nameKey]),
        description: String(reason[desKey] ?? "暂无说明")
      });
    }
  }
  return params;
}

/** 本地兜底：接口无 reason/ops 时的静态参数定义 */
export const FALLBACK_ALARM_PARAM_DEFS: Record<string, ExtParam[]> = {
  "2001": [
    {
      key: "ext1",
      name: "灵敏度",
      description: "检测灵敏度，取值 1-10，值越大越灵敏"
    },
    {
      key: "ext2",
      name: "报警间隔(秒)",
      description: "相邻两次报警的最小时间间隔"
    }
  ]
};
