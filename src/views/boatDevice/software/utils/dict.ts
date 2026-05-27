/**
 * 软件更新模块 - 字典常量与工具函数
 * 包含状态映射、进度状态转换，以及 Mock 数据。
 * 分组映射统一从 boatDevice/dict 引入。
 */
import type { UpdateRecord, SoftwareVersion, DeviceItem } from "./types";
export { GROUP_MAP, getGroupName } from "../../dict";

export const UPDATE_STATUS_MAP: Record<string, string> = {
  "0": "未下载",
  "1": "下载中",
  "2": "下载完成"
};

export const UPDATE_STATUS_TYPE: Record<
  string,
  "info" | "warning" | "success"
> = {
  "0": "info",
  "1": "warning",
  "2": "success"
};

export function getProgressStatus(
  status: string
): "success" | "warning" | "exception" | "" {
  if (status === "2") return "success";
  if (status === "1") return "warning";
  return "";
}

export const MOCK_DEVICES: DeviceItem[] = [
  {
    devid: "DEV001",
    shipname_cn: "东方红1号",
    shipname_en: "Orient Red 1",
    type: "1"
  },
  {
    devid: "DEV002",
    shipname_cn: "海洋探索者",
    shipname_en: "Ocean Explorer",
    type: "2"
  },
  {
    devid: "DEV003",
    shipname_cn: "蓝鲸号",
    shipname_en: "Blue Whale",
    type: "3"
  },
  {
    devid: "DEV004",
    shipname_cn: "渔丰1号",
    shipname_en: "Fish Rich 1",
    type: "1"
  },
  {
    devid: "DEV005",
    shipname_cn: "海星号",
    shipname_en: "Sea Star",
    type: "4"
  },
  {
    devid: "DEV006",
    shipname_cn: "南海一号",
    shipname_en: "South Sea 1",
    type: "5"
  }
];

export const MOCK_VERSIONS: SoftwareVersion[] = [
  {
    uuid: "sv001",
    ver_name: "检测软件",
    version: "2.1.0",
    size: "45.2",
    create_time: "2026-04-01 10:00:00"
  },
  {
    uuid: "sv002",
    ver_name: "检测软件",
    version: "2.0.0",
    size: "43.8",
    create_time: "2026-03-01 10:00:00"
  },
  {
    uuid: "sv003",
    ver_name: "检测软件",
    version: "1.9.5",
    size: "41.2",
    create_time: "2026-02-01 10:00:00"
  },
  {
    uuid: "sv004",
    ver_name: "模型",
    version: "1.4.0",
    size: "132.6",
    create_time: "2026-04-15 10:00:00"
  },
  {
    uuid: "sv005",
    ver_name: "模型",
    version: "1.3.5",
    size: "128.6",
    create_time: "2026-03-15 10:00:00"
  },
  {
    uuid: "sv006",
    ver_name: "船端客户端",
    version: "3.0.1",
    size: "28.4",
    create_time: "2026-04-20 10:00:00"
  },
  {
    uuid: "sv007",
    ver_name: "船端客户端",
    version: "3.0.0",
    size: "27.9",
    create_time: "2026-03-20 10:00:00"
  },
  {
    uuid: "sv008",
    ver_name: "同步软件",
    version: "1.2.3",
    size: "12.1",
    create_time: "2026-04-10 10:00:00"
  },
  {
    uuid: "sv009",
    ver_name: "通信服务",
    version: "2.5.0",
    size: "18.7",
    create_time: "2026-04-05 10:00:00"
  }
];

export const MOCK_UPDATES: UpdateRecord[] = [
  {
    uuid: "u001",
    devid: "DEV001",
    shipname_cn: "东方红1号",
    deviceType: "1",
    name: "检测软件",
    version: "2.1.0",
    size: "45.2",
    status: "2",
    progress: "100",
    create_time: "2026-05-10 09:00:00"
  },
  {
    uuid: "u002",
    devid: "DEV002",
    shipname_cn: "海洋探索者",
    deviceType: "2",
    name: "模型",
    version: "1.4.0",
    size: "132.6",
    status: "1",
    progress: "62.3",
    create_time: "2026-05-12 10:30:00"
  },
  {
    uuid: "u003",
    devid: "DEV003",
    shipname_cn: "蓝鲸号",
    deviceType: "3",
    name: "船端客户端",
    version: "3.0.1",
    size: "28.4",
    status: "0",
    progress: "0",
    create_time: "2026-05-12 11:00:00"
  },
  {
    uuid: "u004",
    devid: "DEV004",
    shipname_cn: "渔丰1号",
    deviceType: "1",
    name: "同步软件",
    version: "1.2.3",
    size: "12.1",
    status: "2",
    progress: "100",
    create_time: "2026-05-08 08:00:00"
  },
  {
    uuid: "u005",
    devid: "DEV005",
    shipname_cn: "海星号",
    deviceType: "4",
    name: "通信服务",
    version: "2.5.0",
    size: "18.7",
    status: "1",
    progress: "28.5",
    create_time: "2026-05-12 09:15:00"
  },
  {
    uuid: "u006",
    devid: "DEV006",
    shipname_cn: "南海一号",
    deviceType: "5",
    name: "检测软件",
    version: "2.0.0",
    size: "43.8",
    status: "0",
    progress: "0",
    create_time: "2026-05-11 14:00:00"
  }
];
