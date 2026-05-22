import { http } from "@/utils/http";
import type { RequestMethods } from "@/utils/http/types.d";
import type { PureHttpRequestConfig } from "@/utils/http/types.d";

/** 电子围栏查询参数 */
export type FenceListQuery = {
  /** 数据类型，-1 表示全部 */
  datatype?: string;
  /** 水域类型，-1 表示全部 */
  areatype?: string;
  /** 区域名称，default 表示全部 */
  name?: string;
  /** 设备编号，-1 表示全部 */
  devid?: string;
};

/** 围栏坐标点 */
export type FenceGeoPoint = {
  lng: number;
  lat: number;
};

/** 新增电子围栏请求体 */
export type FenceSaveDTO = {
  sid: string;
  datatype: string;
  areatype: string;
  name: string;
  data: FenceGeoPoint[];
  devid: string;
  project?: string;
  user?: string;
  create_time?: string;
};

/** 电子围栏列表项（接口原始结构） */
export type FenceListItemDTO = {
  sid?: string | number;
  areatype?: string | number;
  name?: string;
  datatype?: string | number;
  data?: unknown;
  user?: string;
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

/** 查询电子围栏列表 */
export const getFenceListQuery = (params?: FenceListQuery) => {
  return deviceRequest<FenceListItemDTO[]>("get", "/data/fence/query", {
    params: {
      datatype: params?.datatype ?? "-1",
      areatype: params?.areatype ?? "-1",
      name: params?.name ?? "default",
      devid: params?.devid ?? "-1"
    }
  });
};

const buildFenceSaveBody = (data: FenceSaveDTO) => ({
  ...data,
  project: data.project ?? "",
  user: data.user ?? "",
  create_time: data.create_time ?? ""
});

/** 新增电子围栏 */
export const addFenceList = (data: FenceSaveDTO) => {
  return deviceRequest<void>("post", "/data/fence/add", {
    params: { devid: data.devid },
    data: buildFenceSaveBody(data)
  });
};

/** 编辑电子围栏 */
export const updateFenceList = (data: FenceSaveDTO) => {
  return deviceRequest<void>("post", "/data/fence/edit", {
    params: { devid: data.devid },
    data: buildFenceSaveBody(data)
  });
};

/** 删除电子围栏 */
export const deleteFenceList = (sid: string) => {
  return deviceRequest<void>("delete", "/data/fence/delete", {
    params: { sid }
  });
};
