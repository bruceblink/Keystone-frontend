import { http } from "@/utils/http";
import type { RequestMethods } from "@/utils/http/types.d";
import type { PureHttpRequestConfig } from "@/utils/http/types.d";

/** 原因类型查询参数 */
export type ReasonTypeListQuery = {
  /** 报警编号，-1 表示全部 */
  id?: string;
  /** 设备编号，-1 表示全部 */
  devid?: string;
};

/** 原因类型列表项（接口原始结构） */
export type ReasonTypeListItemDTO = {
  _id?: string;
  id?: string | number;
  alarmid?: string;
  des?: string;
  type?: string;
  s2cloud?: string | number;
  s2ship?: string | number;
  visibility?: string | number;
  devid?: string;
  create_time?: string;
  updated_at?: string;
  user?: string;
};

/** 新增/编辑原因类型请求体 */
export type ReasonTypeSaveDTO = {
  _id?: string;
  id: string;
  alarmid: string;
  des: string;
  type?: string;
  s2cloud: string;
  s2ship: string;
  visibility: string;
  devid: string;
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

/** 查询原因类型列表 */
export const getReasonTypeListQuery = (params?: ReasonTypeListQuery) => {
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

const buildReasonTypeSaveBody = (data: ReasonTypeSaveDTO) => ({
  id: data.id,
  alarmid: data.alarmid,
  des: data.des,
  type: data.type ?? "1",
  s2cloud: data.s2cloud,
  s2ship: data.s2ship,
  visibility: data.visibility,
  devid: data.devid,
  create_time: data.create_time ?? "",
  _id: data._id ?? ""
});

/** 新增原因类型 */
export const addReasonTypeList = (data: ReasonTypeSaveDTO) => {
  return deviceRequest<void>("post", "/reasontype/dict/add", {
    params: { devid: data.devid },
    data: buildReasonTypeSaveBody(data)
  });
};

/** 编辑原因类型 */
export const updateReasonTypeList = (data: ReasonTypeSaveDTO) => {
  return deviceRequest<void>("post", "/reasontype/dict/edit", {
    params: { devid: data.devid },
    data: buildReasonTypeSaveBody(data)
  });
};

/** 删除原因类型 */
export const deleteReasonTypeList = (_id: string) => {
  return deviceRequest<void>("delete", "/reasontype/dict/delete", {
    params: { _id }
  });
};
