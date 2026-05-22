import { http } from "@/utils/http";
import type { RequestMethods } from "@/utils/http/types.d";
import type { PureHttpRequestConfig } from "@/utils/http/types.d";

/** 系统状态原始列表项 */
export type SystemStatusItemDTO = {
  mainModule?: string;
  subModule?: string;
  ext1?: string;
  ext2?: string;
  ext3?: string;
  ext4?: string;
  ext5?: string;
  createTime?: string;
  create_time?: string;
  [key: string]: unknown;
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

/** 查询系统状态 — GET /selfinspection/data/query */
export const getSystemStatusQuery = (devid: string) => {
  return deviceRequest<SystemStatusItemDTO[]>(
    "get",
    "/selfinspection/data/query",
    {
      params: { devid }
    }
  );
};
