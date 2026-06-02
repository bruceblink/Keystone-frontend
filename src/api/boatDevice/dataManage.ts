import { http } from "@/utils/http";
import type { RequestMethods } from "@/utils/http/types.d";
import type { PureHttpRequestConfig } from "@/utils/http/types.d";
import {
  getComboxDictQuery,
  normalizeComboxRegionMap,
  type ComboxRegionItemDTO
} from "@/api/paramSettings/combox";
import {
  getReasonTypeListQuery,
  type ReasonTypeListItemDTO
} from "@/api/paramSettings/alarmType";

/** 所属水域字典名 — GET /combox/dict/query */
export const WATER_REGION_DICT_NAME = "所属水域";

/** 设备报警列表查询 — POST /get/device/alarm/list */
export type DeviceAlarmListQuery = {
  starttime?: string;
  endtime?: string;
  /** 处理状态，-1 全部 */
  status?: number;
  /** 上传/审核状态，-1 全部 */
  review?: number;
  alarmtype?: number[];
  sync?: string;
  devid?: string;
  devidlist?: string[];
};

export type DeviceAlarmItemDTO = {
  address?: string;
  alarmtype?: number;
  camid?: string;
  create_time?: string | null;
  devid?: string;
  dutylevel?: number;
  ext1?: string;
  ext2?: string;
  lat?: number;
  level?: number;
  lng?: number;
  picnum?: number;
  picurl1?: string;
  picurl2?: string;
  picurl3?: string;
  picurl4?: string;
  reason?: number;
  region?: number;
  shipstatus?: number;
  sid?: string;
  speed?: number;
  state?: number;
  stime?: string;
  sync?: string;
  timetype?: string;
  uuid?: string;
  videourl?: string;
  review?: number;
  [key: string]: unknown;
};

/** 项目电子围栏项 */
export type ProjectFenceItemDTO = {
  sid?: string | number;
  areatype?: string | number;
  name?: string;
  datatype?: string | number;
  data?: unknown;
  project?: string;
  create_time?: string;
};

type DeviceRawResponse<T> = {
  code?: number;
  statuscode?: number;
  message?: string;
  data?: T;
};

const deviceApiConfig: PureHttpRequestConfig = {
  beforeResponseCallback: () => {}
};

const isDeviceSuccess = (raw: DeviceRawResponse<unknown>) =>
  raw.code === 200 ||
  raw.statuscode === 200 ||
  raw.code === 0 ||
  raw.statuscode === 0;

const deviceRequest = <T>(
  method: RequestMethods,
  url: string,
  param?: Record<string, unknown>
): Promise<ResponseData<T>> => {
  return http
    .request<DeviceRawResponse<T>>(method, url, param, deviceApiConfig)
    .then(raw => {
      if (!isDeviceSuccess(raw)) {
        return Promise.reject(new Error(raw.message || "请求失败"));
      }
      return {
        code: 0,
        msg: raw.message ?? "",
        data: raw.data as T
      };
    });
};

const defaultEndTime = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

/** 报警类型 — GET /reasontype/dict/query */
export const getDataManageAlarmTypeDict = () =>
  getReasonTypeListQuery({ id: "-1", devid: "-1" });

export function dedupeAlarmTypeOptions(
  list: ReasonTypeListItemDTO[] | null | undefined
): { id: number; des: string }[] {
  if (!Array.isArray(list)) return [];
  const idMap = new Map<string, ReasonTypeListItemDTO>();
  for (const item of list) {
    const key = String(item.id ?? "");
    if (!idMap.has(key)) idMap.set(key, item);
  }
  const desMap = new Map<string, ReasonTypeListItemDTO>();
  for (const item of idMap.values()) {
    const des = String(item.des ?? "");
    if (!desMap.has(des)) desMap.set(des, item);
  }
  return Array.from(desMap.values())
    .map(item => ({
      id: Number(item.id),
      des: item.des ?? String(item.id ?? "")
    }))
    .filter(item => !Number.isNaN(item.id));
}

/** 所属水域 — GET /combox/dict/query */
export const getDataManageWaterRegionDict = () =>
  getComboxDictQuery({ name: WATER_REGION_DICT_NAME, devid: "default" });

export { normalizeComboxRegionMap };
export type { ComboxRegionItemDTO };

/** 报警列表 — POST /get/device/alarm/list */
export const postDeviceAlarmList = (query: DeviceAlarmListQuery) => {
  return deviceRequest<DeviceAlarmItemDTO[]>("post", "/get/device/alarm/list", {
    data: {
      starttime: query.starttime ?? "2025-01-20 00:00:00",
      endtime: query.endtime ?? defaultEndTime(),
      status: query.status ?? -1,
      review: query.review ?? -1,
      alarmtype: Array.isArray(query.alarmtype) ? query.alarmtype : [],
      sync: query.sync ?? "-1",
      devid: query.devid ?? "",
      devidlist: Array.isArray(query.devidlist) ? query.devidlist : []
    }
  }).then(res => ({
    ...res,
    data: Array.isArray(res.data) ? res.data : []
  }));
};

/** 项目电子围栏 — POST /data/projectfence/manage?action=query */
export const getProjectFenceList = () => {
  return deviceRequest<ProjectFenceItemDTO[]>(
    "post",
    "/data/projectfence/manage",
    {
      params: {
        action: "query",
        projectid: "-1",
        sid: "-1"
      },
      data: {
        sid: "",
        datatype: "",
        areatype: "",
        name: "",
        project: "-1",
        create_time: "",
        data: []
      }
    }
  ).then(res => ({
    ...res,
    data: Array.isArray(res.data) ? res.data : []
  }));
};
