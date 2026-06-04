import { http } from "@/utils/http";
import type { RequestMethods } from "@/utils/http/types.d";
import type { PureHttpRequestConfig } from "@/utils/http/types.d";

/** 下拉字典查询参数 */
export type ComboxDictQuery = {
  /** 字典名称，如「所属水域」 */
  name: string;
  /** 服务模块分组 */
  groupKey?: string;
  /** 设备编号 */
  devid: string;
};

/** 所属水域等 combox 项（item + sort） */
export type ComboxRegionItemDTO = {
  item?: string;
  sort?: string | number;
  name?: string;
};

/** 下拉字典项（接口可能返回多种字段） */
export type ComboxDictItemDTO = {
  item?: string;
  value?: string | number;
  label?: string;
  text?: string;
  name?: string;
  keyname?: string;
  keyvalue?: string;
  groupKey?: string;
  des?: string;
  id?: string | number;
};

export type ComboxOption = {
  label: string;
  value: string;
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

/** 将接口项规范为下拉选项（value 存库、label 展示） */
export function normalizeComboxOptions(
  list: ComboxDictItemDTO[] | null | undefined
): ComboxOption[] {
  if (!Array.isArray(list)) return [];
  const options: ComboxOption[] = [];
  for (const item of list) {
    const label = String(
      item.item ??
        item.label ??
        item.text ??
        item.name ??
        item.keyname ??
        item.des ??
        ""
    ).trim();
    const value = String(
      item.value ?? item.keyvalue ?? item.id ?? item.keyname ?? ""
    ).trim();
    if (!label && !value) continue;
    options.push({
      label: label || value,
      value: value || label
    });
  }
  return options;
}

/** 所属水域 sort -> 名称 */
export function normalizeComboxRegionMap(
  list: ComboxRegionItemDTO[] | null | undefined
): Record<string, string> {
  if (!Array.isArray(list)) return {};
  const map: Record<string, string> = {};
  for (const item of list) {
    if (item.sort == null || item.sort === "") continue;
    map[String(item.sort)] = String(item.item ?? item.sort);
  }
  return map;
}

/** 查询下拉字典 */
export const getComboxDictQuery = (params: ComboxDictQuery) => {
  return deviceRequest<ComboxDictItemDTO[]>(
    "get",
    "/device/dictionaries/items",
    {
      params: {
        dictType: params.name,
        devid: params.devid,
        groupKey: params.groupKey || undefined,
        status: 1,
        includeGlobal: true
      }
    }
  );
};
