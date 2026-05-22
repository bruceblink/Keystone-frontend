import type { FieldLabels } from "./types";

export const DEFAULT_DIALOG_LABELS: FieldLabels = {
  subModule: "子模块",
  ext1: "状态",
  ext2: "扩展字段2",
  ext3: "扩展字段3",
  ext4: "扩展字段4",
  ext5: "扩展字段5"
};

export function formatTraffic(traffic: number): string {
  if (traffic >= 1024) return (traffic / 1024).toFixed(1);
  return traffic.toFixed(1);
}

export function getTrafficUnit(traffic: number): string {
  return traffic >= 1024 ? "GB" : "MB";
}

export function getExt1Class(
  val: unknown
): "is-success" | "is-danger" | "is-info" {
  const text = String(val ?? "").trim();
  if (
    text.includes("成功") ||
    text.includes("正常") ||
    text.includes("正确") ||
    text.includes("检测中")
  ) {
    return "is-success";
  }
  if (
    text.includes("失败") ||
    text.includes("异常") ||
    text.includes("移位") ||
    text.includes("黑屏") ||
    text.includes("被遮挡") ||
    text.includes("错误") ||
    text.includes("不存在") ||
    text.includes("未配置") ||
    text.includes("花屏") ||
    text.includes("分辨率改变")
  ) {
    return "is-danger";
  }
  return "is-info";
}
