import { http } from "@/utils/http";
import type { RequestMethods } from "@/utils/http/types.d";
import type { PureHttpRequestConfig } from "@/utils/http/types.d";

/** 设备列表项（接口原始结构） */
export type DeviceListItemDTO = {
  _id?: string;
  camid?: string;
  devname?: string;
  ipaddr?: string;
  user?: string;
  passwd?: string;
  url?: string;
  brand?: string;
  type?: string;
  status?: string;
  areaid?: string;
  areacode?: string;
  sub_stream?: string;
  inference?: string;
  create_time?: string;
  devid?: string;
};

/** 新增/编辑设备请求体 */
export type DeviceSaveDTO = {
  _id?: string;
  camid: string;
  devname: string;
  ipaddr?: string;
  user?: string;
  passwd?: string;
  url: string;
  brand: string;
  type: string;
  status: string;
  areaid: string;
  areacode: string;
  sub_stream?: string;
  inference?: string;
  create_time?: string;
  devid: string;
};

/** 报警参数列表项 */
export type AlarmConditionDTO = {
  _id?: string;
  camid?: string;
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

/** 查询设备列表 */
export const getDeviceListQuery = (devid: string) => {
  return deviceRequest<DeviceListItemDTO[]>("get", "/device/data/query", {
    params: { devid }
  });
};

/** 新增设备 */
export const addDevice = (devid: string, data: DeviceSaveDTO) => {
  return deviceRequest<void>("post", "/device/data/add", {
    params: { devid },
    data
  });
};

/** 修改设备 */
export const updateDevice = (devid: string, data: DeviceSaveDTO) => {
  return deviceRequest<void>("post", "/device/data/update", {
    params: { devid },
    data
  });
};

/** 删除设备 */
export const deleteDevices = (devids: string[]) => {
  return deviceRequest<void>("post", "/device/data/delete", {
    data: { devids }
  });
};

/** 查询报警参数 */
export const getAlarmConditionQuery = (devid: string) => {
  return deviceRequest<AlarmConditionDTO[]>("get", "/alarm/condition/query", {
    params: { alarmtype: "-1", devid }
  });
};

/** 删除报警参数 */
export const deleteAlarmCondition = (_id: string) => {
  return deviceRequest<void>("delete", "/alarm/condition/delete", {
    params: { _id }
  });
};
