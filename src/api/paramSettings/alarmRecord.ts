import { http } from "@/utils/http";
import type { RequestMethods } from "@/utils/http/types.d";
import type { PureHttpRequestConfig } from "@/utils/http/types.d";
import {
  getComboxDictQuery,
  normalizeComboxRegionMap,
  type ComboxRegionItemDTO
} from "./combox";
import {
  getReasonTypeListQuery,
  type ReasonTypeListItemDTO
} from "./alarmType";

/** 水域类型字典名（GET /combox/dict/query 的 name） */
export const WATER_REGION_DICT_NAME = "所属水域";

/** 报警记录查询参数 POST /bp/alarm/data/list */
export type AlarmRecordListQuery = {
  starttime?: string;
  endtime?: string;
  /** -1 全部，0 未处理，1 已处理，2 已作废 */
  status?: string | number;
  /** 报警原因 id 列表 */
  alarmtype?: (string | number)[];
  sync?: string;
  devid: string;
  devidlist?: string[];
};

/** 报警记录列表项 */
export type AlarmRecordItemDTO = {
  sid?: string | number;
  camid?: string;
  alarmtype?: string | number;
  stime?: string;
  state?: number;
  address?: string;
  speed?: string | number;
  level?: string | number;
  region?: string | number;
  lng?: string | number;
  lat?: string | number;
  picurl1?: string;
  picurl2?: string;
  picurl3?: string;
  picurl4?: string;
  videourl?: string;
  uuid?: string;
  devid?: string;
  [key: string]: unknown;
};

export type AlarmReasonOption = { value: string; label: string };

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

const sortByStimeDesc = (list: AlarmRecordItemDTO[]) =>
  [...list].sort(
    (a, b) =>
      new Date(b.stime || 0).getTime() - new Date(a.stime || 0).getTime()
  );

const toAlarmtypePayload = (list?: (string | number)[]) => {
  if (!Array.isArray(list) || !list.length) return [];
  return list.map(v => {
    const n = Number(v);
    return Number.isNaN(n) ? v : n;
  });
};

/** 1. 水域类型 — GET /combox/dict/query */
export const getWaterRegionDictQuery = (devid: string) => {
  return getComboxDictQuery({
    name: WATER_REGION_DICT_NAME,
    devid
  });
};

export { normalizeComboxRegionMap };
export type { ComboxRegionItemDTO };

/** 2. 报警原因 — GET /reasontype/dict/query */
export const getAlarmReasonDictQuery = (devid: string) => {
  return getReasonTypeListQuery({ id: "-1", devid });
};

export function normalizeAlarmReasonOptions(
  list: ReasonTypeListItemDTO[] | null | undefined
): AlarmReasonOption[] {
  if (!Array.isArray(list)) return [];
  return list.map(item => ({
    value: String(item.id ?? ""),
    label: item.des ?? String(item.id ?? "")
  }));
}

export function buildAlarmReasonMap(
  list: ReasonTypeListItemDTO[] | null | undefined
): Record<string, string> {
  if (!Array.isArray(list)) return {};
  return Object.fromEntries(
    list.map(item => [String(item.id ?? ""), item.des ?? ""])
  );
}

/** 3. 报警记录 — POST /bp/alarm/data/list */
export const postAlarmRecordList = (query: AlarmRecordListQuery) => {
  const devid = query.devid;
  return deviceRequest<AlarmRecordItemDTO[]>("post", "/bp/alarm/data/list", {
    data: {
      starttime: query.starttime ?? "",
      endtime: query.endtime ?? "",
      status: query.status ?? -1,
      alarmtype: toAlarmtypePayload(query.alarmtype),
      sync: query.sync ?? "",
      devid,
      devidlist: query.devidlist ?? (devid ? [devid] : [])
    }
  }).then(res => ({
    ...res,
    data: sortByStimeDesc(Array.isArray(res.data) ? res.data : [])
  }));
};

/** 删除报警记录 — DELETE /bp/alarm/data/delete */
export const deleteAlarmRecord = (sid: string) => {
  return deviceRequest<void>("delete", "/bp/alarm/data/delete", {
    params: { sid }
  });
};
