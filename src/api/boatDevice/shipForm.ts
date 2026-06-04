import { http } from "@/utils/http";
import type { RequestMethods } from "@/utils/http/types.d";
import type { PureHttpRequestConfig } from "@/utils/http/types.d";

/** 设备列表查询参数 */
export type DeviceListQuery = {
  /** 设备编号 */
  devid?: string;
  /** 所属分组 */
  type?: string;
};

/** 设备列表项 */
export type DeviceListItemDTO = {
  /** 设备编号 */
  devid?: string | number;
  /** 船名（中文） */
  shipname_cn?: string;
  /** 船名（英文） */
  shipname_en?: string;
  /** 所属分组 */
  type?: string | number;
  /** MMSI */
  mmsi?: string | number;
  /** 经度 */
  lng?: string | number;
  /** 纬度 */
  lat?: string | number;
  /** 航速 */
  speed?: string | number;
  /** 版本号 */
  version?: string;
  /** 航行状态 */
  navstatus?: string | number;
  /** 在线状态 */
  online?: string | number;
  /** 备注 */
  remarks?: string;
  /** 更新时间 */
  create_time?: string;
};

export type LocalDeviceInfoDTO = {
  side?: "ship" | "shore" | string;
  devid?: string;
  device?: DeviceListItemDTO | null;
};

/** 新增/更新设备请求体 */
export type DeviceSaveDTO = {
  /** 设备编号 */
  devid: string;
  /** MMSI */
  mmsi: string;
  /** 经度 */
  lng: string;
  /** 纬度 */
  lat: string;
  /** 航行状态 */
  navstatus: string;
  /** 版本号 */
  version: string;
  /** 在线状态 */
  online: string;
  /** 所属分组 */
  type: string;
  /** 航速 */
  speed: string;
  /** 船名（中文） */
  shipname_cn: string;
  /** 船名（英文） */
  shipname_en: string;
  /** 创建时间 */
  create_time: string;
};

type DeviceRawResponse<T> = {
  code?: number;
  statuscode?: number;
  message?: string;
  data?: T;
};

/** 设备接口成功码为 200，绕过全局 code === 0 校验 */
const deviceApiConfig: PureHttpRequestConfig = {
  beforeResponseCallback: () => {}
};

const isDeviceSuccess = (raw: DeviceRawResponse<unknown>) =>
  raw.code === 200 ||
  raw.statuscode === 200 ||
  raw.code === 0 ||
  raw.statuscode === 0;

/** 将设备接口响应转换为统一的 ResponseData 结构 */
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

/** 查询设备列表 */
export const getDeviceListQuery = (params?: DeviceListQuery) => {
  return deviceRequest<DeviceListItemDTO[]>("get", "/device/list/query", {
    params
  });
};

/** 查询当前部署本船信息 */
export const getLocalDeviceInfo = () => {
  return deviceRequest<LocalDeviceInfoDTO>("get", "/device/local/info");
};

/** 新增设备 */
export const addDeviceList = (data: DeviceSaveDTO) => {
  return deviceRequest<void>("post", "/device/list/add", { data });
};

/** 更新设备 */
export const updateDeviceList = (data: DeviceSaveDTO) => {
  return deviceRequest<void>("post", "/device/list/update", { data });
};

/** 删除设备 */
export const deleteDeviceList = (devid: string) => {
  return deviceRequest<string>("delete", "/device/list/delete", {
    params: { devid }
  });
};
