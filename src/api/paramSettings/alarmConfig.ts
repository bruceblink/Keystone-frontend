import { http } from "@/utils/http";
import type { RequestMethods } from "@/utils/http/types.d";
import type { PureHttpRequestConfig } from "@/utils/http/types.d";
import type { AreaItem } from "@/views/paramSettings/alarmConfig/utils/types";
import type { ReasonTypeListItemDTO } from "@/api/paramSettings/alarmType";

export type { ReasonTypeListItemDTO };

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

/** 报警参数（条件）列表项 */
export type AlarmConditionDTO = {
  _id?: string;
  sid?: string;
  camid?: string;
  alarmtype?: string;
  devid?: string;
  ext1?: string;
  ext2?: string;
  ext3?: string;
  ext4?: string;
  ext5?: string;
  ext6?: string;
  ext7?: string;
  ext8?: string;
  area?: AreaItem[];
  create_time?: string;
  [key: string]: unknown;
};

/** 新增/编辑报警参数请求体 */
export type AlarmConditionSaveDTO = {
  _id?: string;
  sid: string;
  camid: string;
  alarmtype: string;
  devid: string;
  ext1?: string;
  ext2?: string;
  ext3?: string;
  ext4?: string;
  ext5?: string;
  ext6?: string;
  ext7?: string;
  ext8?: string;
  area?: AreaItem[];
  create_time?: string;
};

/** 算法参数定义（reason/ops） */
export type ReasonOpsDTO = Record<string, string | undefined>;

/** 下载截图请求体 POST /data/screenshot/download */
export type CameraScreenshotBody = {
  devid: string;
  camid: string;
  rtspurl?: string;
};

/** 报警原因查询参数 */
export type AlarmReasonTypeQuery = {
  /** 报警编号，-1 表示全部 */
  id?: string;
  /** 设备/船只编号，-1 表示全部 */
  devid?: string;
};

/**
 * 查询原因类型字典（报警原因列表）
 * GET /reasontype/dict/query
 */
export const getAlarmReasonTypeListQuery = (params?: AlarmReasonTypeQuery) => {
  return deviceRequest<ReasonTypeListItemDTO[]>(
    "get",
    "/reasontype/dict/query",
    {
      params: {
        id: params?.id ?? "-1",
        devid: params?.devid ?? "-1"
      }
    }
  );
};

/** 报警原因查询（全部编号 + 指定船只，默认 id=-1） */
export const getAlarmReasonTypeListAll = (devid: string) =>
  getAlarmReasonTypeListQuery({ id: "-1", devid });

/** 查询报警参数列表 */
export const getAlarmConditionList = (devid: string, alarmtype = "-1") => {
  return deviceRequest<AlarmConditionDTO[]>("get", "/alarm/condition/query", {
    params: { alarmtype, devid }
  });
};

/** 新增报警参数 */
export const addAlarmCondition = (
  devid: string,
  data: AlarmConditionSaveDTO
) => {
  return deviceRequest<void>("post", "/alarm/condition/add", {
    params: { devid },
    data
  });
};

/** 修改报警参数 */
export const updateAlarmCondition = (
  devid: string,
  data: AlarmConditionSaveDTO
) => {
  return deviceRequest<void>("post", "/alarm/condition/edit", {
    params: { devid },
    data
  });
};

/** 删除报警参数 */
export const deleteAlarmConditionById = (_id: string) => {
  return deviceRequest<void>("delete", "/alarm/condition/delete", {
    params: { _id }
  });
};

/** 获取算法参数配置定义 GET /reason/ops/query */
export const getReasonOpsQuery = (devid: string, reasonId: string) => {
  return deviceRequest<ReasonOpsDTO[]>("get", "/reason/ops/query", {
    params: { reason_id: reasonId, devid }
  });
};

/**
 * 下载截图数据
 * POST /data/screenshot/download
 * Body: { devid, camid, rtspurl }
 */
export const downloadCameraScreenshot = (payload: CameraScreenshotBody) => {
  return deviceRequest<unknown>("post", "/data/screenshot/download", {
    data: {
      devid: payload.devid,
      camid: payload.camid,
      rtspurl: payload.rtspurl ?? ""
    }
  });
};

/** 解析截图接口返回为可展示的 data URL */
export function parseScreenshotUrl(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "string") {
    const text = raw.trim();
    if (!text) return "";
    if (text.startsWith("{") || text.startsWith("[")) {
      try {
        const parsed = JSON.parse(text) as Record<string, unknown>;
        const dataUrl = parsed?.data ?? parsed?.body ?? parsed?.result;
        return typeof dataUrl === "string" ? dataUrl.trim() : "";
      } catch {
        return text;
      }
    }
    return text;
  }
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const nested = obj.result as Record<string, unknown> | undefined;
    const dataUrl = obj.data ?? obj.body ?? nested?.data;
    return typeof dataUrl === "string" ? dataUrl.trim() : "";
  }
  return "";
}
