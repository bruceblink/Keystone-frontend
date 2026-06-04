import { http } from "@/utils/http";
import type { RequestMethods } from "@/utils/http/types.d";
import type { PureHttpRequestConfig } from "@/utils/http/types.d";

/** 数据字典查询参数 */
export type DictListQuery = {
  /** 键名，default 表示全部 */
  keyname?: string;
  /** 服务模块分组 */
  groupKey?: string;
  /** 设备编号，-1 表示全部 */
  devid?: string;
};

/** 数据字典列表项（接口原始结构） */
export type DictListItemDTO = {
  _id?: string;
  keyname?: string;
  keyvalue?: string;
  type?: string;
  /** 接口字段拼写为 descripton */
  descripton?: string;
  user?: string;
  groupKey?: string;
  devid?: string;
  create_time?: string;
};

type DeviceConfigItemDTO = {
  id?: string;
  _id?: string;
  value?: string;
  label?: string;
  keyname?: string;
  keyvalue?: string;
  groupKey?: string;
  devid?: string;
  extra?: {
    valueType?: string;
    description?: string;
    user?: string;
  };
};

export type ConfigModuleOption = {
  label: string;
  value: string;
};

/** 新增/编辑数据字典请求体 */
export type DictSaveDTO = {
  _id?: string;
  keyname: string;
  keyvalue: string;
  type: string;
  descripton: string;
  user: string;
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

/** 查询数据字典列表 */
export const getDictListQuery = (params?: DictListQuery) => {
  return deviceRequest<DeviceConfigItemDTO[]>(
    "get",
    "/device/dictionaries/items",
    {
      params: {
        dictType: "device.config",
        devid: params?.devid ?? "-1",
        groupKey: params?.groupKey || undefined,
        status: 1,
        includeGlobal: true
      }
    }
  ).then(res => ({
    ...res,
    data: (Array.isArray(res.data) ? res.data : [])
      .filter(item => {
        const key = item.value ?? item.keyname ?? "";
        return (
          !params?.keyname ||
          params.keyname === "default" ||
          key === params.keyname
        );
      })
      .map(item => ({
        _id: item._id ?? item.id,
        keyname: item.value ?? item.keyname,
        keyvalue: item.label ?? item.keyvalue,
        type: item.extra?.valueType,
        descripton: item.extra?.description,
        user: item.extra?.user,
        groupKey: item.groupKey,
        devid: item.devid
      }))
  }));
};

/** 查询配置模块字典 */
export const getConfigModuleOptions = () => {
  return deviceRequest<DeviceConfigItemDTO[]>(
    "get",
    "/device/dictionaries/items",
    {
      params: {
        dictType: "device.configModule",
        devid: "-1",
        status: 1,
        includeGlobal: true
      }
    }
  ).then(res => ({
    ...res,
    data: (Array.isArray(res.data) ? res.data : [])
      .map(item => ({
        label: String(item.label ?? item.keyvalue ?? item.value ?? ""),
        value: String(item.value ?? item.keyname ?? "")
      }))
      .filter(item => item.label && item.value)
  }));
};

/** 新增数据字典 */
export const addDictList = (data: DictSaveDTO) => {
  return deviceRequest<void>("post", "/device/dictionaries/items", {
    params: { devid: data.devid },
    data: {
      id: data._id ?? "",
      dictType: "device.config",
      value: data.keyname,
      label: data.keyvalue,
      groupKey: data.groupKey ?? "",
      status: 1,
      devid: data.devid,
      extra: {
        valueType: data.type,
        description: data.descripton,
        user: data.user ?? ""
      }
    }
  });
};

/** 编辑数据字典 */
export const updateDictList = (data: DictSaveDTO) => {
  return deviceRequest<void>("put", `/device/dictionaries/items/${data._id}`, {
    data: {
      dictType: "device.config",
      value: data.keyname,
      label: data.keyvalue,
      groupKey: data.groupKey ?? "",
      status: 1,
      devid: data.devid,
      extra: {
        valueType: data.type,
        description: data.descripton,
        user: data.user ?? ""
      }
    }
  });
};

/** 删除数据字典 */
export const deleteDictList = (_id: string) => {
  return deviceRequest<void>("delete", `/device/dictionaries/items/${_id}`);
};
