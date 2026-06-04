import { http } from "@/utils/http";
import type { RequestMethods } from "@/utils/http/types.d";
import type { PureHttpRequestConfig } from "@/utils/http/types.d";

/** 原因类型查询参数 */
export type ReasonTypeListQuery = {
  /** 报警编号，-1 表示全部 */
  id?: string;
  /** 服务模块分组 */
  groupKey?: string;
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
  groupKey?: string;
  devid?: string;
  create_time?: string;
  updated_at?: string;
  user?: string;
  extra?: {
    alarmid?: string;
    s2cloud?: string | number;
    s2ship?: string | number;
    visibility?: string | number;
    type?: string;
  };
  label?: string;
  value?: string | number;
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
  groupKey?: string;
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
    "/device/dictionaries/items",
    {
      params: {
        dictType: "device.reasonType",
        value: params?.id && params.id !== "-1" ? params.id : undefined,
        devid: params?.devid ?? "-1",
        groupKey: params?.groupKey || undefined,
        status: 1,
        includeGlobal: true
      }
    }
  ).then(res => ({
    ...res,
    data: (Array.isArray(res.data) ? res.data : []).map<ReasonTypeListItemDTO>(
      item => ({
        ...item,
        _id: String(item._id ?? item.id ?? ""),
        id: String(item.value ?? item.id ?? ""),
        alarmid: String(item.alarmid ?? item.extra?.alarmid ?? ""),
        des: String(item.des ?? item.label ?? ""),
        groupKey: item.groupKey,
        type: String(item.type ?? item.extra?.type ?? ""),
        s2cloud: item.s2cloud ?? item.extra?.s2cloud,
        s2ship: item.s2ship ?? item.extra?.s2ship,
        visibility: item.visibility ?? item.extra?.visibility
      })
    )
  }));
};

/** 新增原因类型 */
export const addReasonTypeList = (data: ReasonTypeSaveDTO) => {
  return deviceRequest<void>("post", "/device/dictionaries/items", {
    params: { devid: data.devid },
    data: {
      id: data._id ?? "",
      dictType: "device.reasonType",
      value: data.id,
      label: data.des,
      parentValue: data.alarmid,
      groupKey: data.groupKey ?? "",
      status: 1,
      devid: data.devid,
      extra: {
        alarmid: data.alarmid,
        type: data.type ?? "1",
        s2cloud: data.s2cloud,
        s2ship: data.s2ship,
        visibility: data.visibility
      }
    }
  });
};

/** 编辑原因类型 */
export const updateReasonTypeList = (data: ReasonTypeSaveDTO) => {
  return deviceRequest<void>("put", `/device/dictionaries/items/${data._id}`, {
    data: {
      dictType: "device.reasonType",
      value: data.id,
      label: data.des,
      parentValue: data.alarmid,
      groupKey: data.groupKey ?? "",
      status: 1,
      devid: data.devid,
      extra: {
        alarmid: data.alarmid,
        type: data.type ?? "1",
        s2cloud: data.s2cloud,
        s2ship: data.s2ship,
        visibility: data.visibility
      }
    }
  });
};

/** 删除原因类型 */
export const deleteReasonTypeList = (_id: string) => {
  return deviceRequest<void>("delete", `/device/dictionaries/items/${_id}`);
};
