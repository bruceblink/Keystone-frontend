/**
 * 船舶设备模块 - 字典常量与工具函数
 * 包含航行状态映射、在线状态计算及 Mock 数据。
 * 分组映射统一从 boatDevice/dict 引入。
 */
import type { DeviceRecord } from "./types";
export { GROUP_MAP, GROUP_FORM_OPTIONS as GROUP_OPTIONS } from "../../dict";

export const NAV_STATUS_MAP: Record<string, string> = {
  "0": "航行",
  "1": "抛锚",
  "2": "空闲",
  "3": "操纵受限制",
  "4": "系泊",
  "5": "靠泊",
  "6": "搁浅",
  "7": "进行捕捞",
  "8": "操帆在航"
};

export const NAV_STATUS_OPTIONS = Object.entries(NAV_STATUS_MAP).map(
  ([value, label]) => ({ value, label })
);

export const ONLINE_STATUS_OPTIONS = [
  { value: "在线", label: "在线" },
  { value: "离线", label: "离线" },
  { value: "异常", label: "异常" }
];

export function getOnlineStatus(device: DeviceRecord): string {
  if (!device.create_time) return "未知";
  const diff = (Date.now() - new Date(device.create_time).getTime()) / 86400000;
  if (diff <= 1) return "在线";
  if (diff <= 5) return "离线";
  return "异常";
}

export function onlineTagType(
  status: string
): "success" | "warning" | "danger" | "info" {
  if (status === "在线") return "success";
  if (status === "离线") return "warning";
  if (status === "异常") return "danger";
  return "info";
}

export const MOCK_DEVICES: DeviceRecord[] = [
  {
    devid: "DEV001",
    shipname_cn: "东方红1号",
    shipname_en: "Orient Red 1",
    type: "1",
    mmsi: "412000001",
    lng: "121.4737",
    lat: "31.2304",
    speed: "12.50",
    version: "v1.2.0",
    navstatus: "0",
    online: "1",
    remarks: "正常运行",
    create_time: "2026-05-12 10:00:00"
  },
  {
    devid: "DEV002",
    shipname_cn: "海洋探索者",
    shipname_en: "Ocean Explorer",
    type: "2",
    mmsi: "412000002",
    lng: "122.1234",
    lat: "30.5678",
    speed: "8.30",
    version: "v1.1.5",
    navstatus: "2",
    online: "0",
    remarks: "",
    create_time: "2026-05-08 08:30:00"
  },
  {
    devid: "DEV003",
    shipname_cn: "蓝鲸号",
    shipname_en: "Blue Whale",
    type: "3",
    mmsi: "412000003",
    lng: "120.9876",
    lat: "29.8765",
    speed: "15.00",
    version: "v1.2.0",
    navstatus: "0",
    online: "1",
    remarks: "货运途中",
    create_time: "2026-05-12 06:20:00"
  },
  {
    devid: "DEV004",
    shipname_cn: "渔丰1号",
    shipname_en: "Fish Rich 1",
    type: "1",
    mmsi: "412000004",
    lng: "119.5432",
    lat: "28.3456",
    speed: "0.00",
    version: "v1.0.8",
    navstatus: "1",
    online: "0",
    remarks: "抛锚作业",
    create_time: "2026-05-05 14:00:00"
  },
  {
    devid: "DEV005",
    shipname_cn: "海星号",
    shipname_en: "Sea Star",
    type: "4",
    mmsi: "412000005",
    lng: "118.7654",
    lat: "32.1234",
    speed: "20.50",
    version: "v1.2.1",
    navstatus: "0",
    online: "1",
    remarks: "客运航线",
    create_time: "2026-05-11 09:15:00"
  },
  {
    devid: "DEV006",
    shipname_cn: "南海一号",
    shipname_en: "South Sea 1",
    type: "5",
    mmsi: "412000006",
    lng: "117.2345",
    lat: "20.5678",
    speed: "11.20",
    version: "v1.1.0",
    navstatus: "0",
    online: "1",
    remarks: "",
    create_time: "2026-04-20 12:00:00"
  }
];
