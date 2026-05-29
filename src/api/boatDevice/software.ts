import { http } from "@/utils/http";
import type { RequestMethods } from "@/utils/http/types.d";
import type { PureHttpRequestConfig } from "@/utils/http/types.d";

/** 设备版本项 — GET /device/version/query */
export type DeviceVersionItemDTO = {
  uuid?: string;
  ver_name?: string;
  version?: string;
  ver_des?: string;
  size?: string | number;
  url?: string;
  path?: string;
  client_path?: string;
  fileUrl?: string;
  md5?: string;
  create_time?: string;
  [key: string]: unknown;
};

/** 版本升级任务项 — GET /version/update/query */
export type VersionUpdateItemDTO = {
  uuid?: string;
  devid?: string;
  name?: string;
  version?: string;
  status?: string | number;
  progress?: string | number;
  url?: string;
  path?: string;
  size?: string | number;
  create_time?: string;
  shipname_cn?: string;
  /** 所属分组编码 */
  type?: string | number;
  [key: string]: unknown;
};

/** 新增版本升级任务 — POST /version/update/add */
export type VersionUpdateAddDTO = {
  uuid: string;
  devid: string;
  name: string;
  version: string;
  status: string;
  progress: string;
  url?: string;
  path?: string;
  create_time: string;
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

/** 查询设备版本列表 — GET /device/version/query */
export const getDeviceVersionQuery = (params?: {
  uuid?: string;
  version?: string;
  ver_name?: string;
}) => {
  return deviceRequest<DeviceVersionItemDTO[]>("get", "/device/version/query", {
    params: {
      uuid: params?.uuid ?? "-1",
      version: params?.version ?? "-1",
      ver_name: params?.ver_name ?? "-1"
    }
  }).then(res => ({
    ...res,
    data: Array.isArray(res.data) ? res.data : []
  }));
};

/** 查询版本升级任务 — GET /version/update/query */
export const getVersionUpdateQuery = (params?: {
  devid?: string;
  status?: string;
}) => {
  return deviceRequest<VersionUpdateItemDTO[]>("get", "/version/update/query", {
    params: {
      devid: params?.devid ?? "-1",
      status: params?.status ?? "-1"
    }
  }).then(res => ({
    ...res,
    data: Array.isArray(res.data) ? res.data : []
  }));
};

/** 新增版本升级任务 — POST /version/update/add */
export const postVersionUpdateAdd = (data: VersionUpdateAddDTO) => {
  return deviceRequest<void>("post", "/version/update/add", { data });
};

/** 删除版本升级任务 — DELETE /version/update/delete */
export const deleteVersionUpdate = (uuid: string) => {
  return deviceRequest<void>("delete", "/version/update/delete", {
    params: { uuid }
  });
};

/** 批量删除版本升级任务 — DELETE /version/update/batch-delete */
export const batchDeleteVersionUpdate = (uuids: string[]) => {
  return deviceRequest<void>("delete", "/version/update/batch-delete", {
    data: uuids
  });
};
