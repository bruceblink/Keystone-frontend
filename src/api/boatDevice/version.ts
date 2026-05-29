import Axios from "axios";
import { http } from "@/utils/http";
import type { RequestMethods } from "@/utils/http/types.d";
import type { PureHttpRequestConfig } from "@/utils/http/types.d";
import { getToken, formatToken } from "@/utils/auth";

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
  server_url?: string;
  md5?: string;
  filename?: string;
  create_time?: string;
  [key: string]: unknown;
};

export type DeviceVersionSaveDTO = {
  uuid: string;
  version: string;
  md5?: string;
  filename?: string;
  ver_name: string;
  ver_des: string;
  server_url?: string;
  client_path: string;
  create_time: string;
  size?: string | number;
  fileUrl?: string;
};

export type ChunkUploadStatusDTO = {
  uploadedChunks?: number;
  totalChunks?: number;
  uploadProgress?: number;
  isMerging?: boolean;
  isMerged?: boolean;
  isMarged?: boolean;
  fileName?: string;
  fileUrl?: string;
  [key: string]: unknown;
};

type DeviceRawResponse<T> = {
  code?: number;
  statuscode?: number;
  message?: string;
  data?: T;
  success?: boolean;
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

const chunkHttp = Axios.create({
  baseURL: import.meta.env.VITE_APP_BASE_API,
  timeout: 0
});

chunkHttp.interceptors.request.use(config => {
  const data = getToken();
  if (data?.token) {
    config.headers["Authorization"] = formatToken(data.token);
  }
  return config;
});

/** 查询设备版本 — GET /device/version/query */
export const getDeviceVersionQuery = (params?: {
  uuid?: string;
  version?: string;
  ver_name?: string;
}) =>
  deviceRequest<DeviceVersionItemDTO[]>("get", "/device/version/query", {
    params: {
      uuid: params?.uuid ?? "-1",
      version: params?.version ?? "-1",
      ver_name: params?.ver_name ?? "-1"
    }
  }).then(res => ({
    ...res,
    data: Array.isArray(res.data) ? res.data : []
  }));

/** 新增设备版本 — POST /device/version/add */
export const addDeviceVersion = (data: DeviceVersionSaveDTO) =>
  deviceRequest<void>("post", "/device/version/add", { data });

/** 更新设备版本 — POST /device/version/update */
export const updateDeviceVersion = (data: DeviceVersionSaveDTO) =>
  deviceRequest<void>("post", "/device/version/update", { data });

/** 删除设备版本 — DELETE /device/version/delete */
export const deleteDeviceVersion = (uuid: string) =>
  deviceRequest<void>("delete", "/device/version/delete", {
    params: { uuid }
  });

/** 上传文件分片 — POST /api/Flie/chunk（与 ConfigurePlatform 一致，元数据走 FormData） */
export const uploadFileChunk = (
  formData: FormData,
  onProgress?: (loaded: number, total: number) => void,
  signal?: AbortSignal
) => {
  return chunkHttp
    .post<DeviceRawResponse<unknown>>("/api/Flie/chunk", formData, {
      signal,
      onUploadProgress: e => {
        if (onProgress && e.total) onProgress(e.loaded, e.total);
      }
    })
    .then(res => res.data);
};

/** 查询分片上传状态 — GET /api/Flie/status/{fileIdentifier} */
export const getChunkUploadStatus = (fileIdentifier: string) => {
  return chunkHttp
    .get<ChunkUploadStatusDTO | DeviceRawResponse<ChunkUploadStatusDTO>>(
      `/api/Flie/status/${encodeURIComponent(fileIdentifier)}`
    )
    .then(res => {
      const body = res.data;
      if (body && typeof body === "object" && "data" in body && body.data) {
        return body.data as ChunkUploadStatusDTO;
      }
      return body as ChunkUploadStatusDTO;
    });
};
