import type { VersionItem } from "./types";

export function formatDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function genUuid(): string {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export const MOCK_VERSIONS: VersionItem[] = [
  {
    uuid: "v001",
    ver_name: "船端客户端",
    version: "1.2.0",
    ver_des: "新增设备连接稳定性优化，修复断线重连问题",
    client_path: "/opt/client/bin",
    fileUrl: "/mock/files/client-1.2.0.zip",
    md5: "abc123def456",
    size: "38.50",
    filename: "client-1.2.0.zip",
    create_time: "2026-04-10 09:30:00"
  },
  {
    uuid: "v002",
    ver_name: "检测软件",
    version: "2.1.3",
    ver_des: "优化目标检测算法，提升识别准确率至98.5%",
    client_path: "/opt/detect/bin",
    fileUrl: "/mock/files/detect-2.1.3.tar.gz",
    md5: "xyz789uvw012",
    size: "256.00",
    filename: "detect-2.1.3.tar.gz",
    create_time: "2026-04-20 14:00:00"
  },
  {
    uuid: "v003",
    ver_name: "模型",
    version: "3.0.1",
    ver_des: "升级基础模型，新增夜间模式支持",
    client_path: "/opt/model",
    fileUrl: "/mock/files/model-3.0.1.bin",
    md5: "mno345pqr678",
    size: "512.00",
    filename: "model-3.0.1.bin",
    create_time: "2026-05-01 10:00:00"
  }
];
