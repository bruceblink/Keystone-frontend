import { http } from "@/utils/http";

export interface DictTypeQuery extends BasePageQuery {
  dictName?: string;
  dictType?: string;
  status?: number;
}

export interface DictTypeDTO {
  dictId?: number;
  dictName?: string;
  dictType?: string;
  status?: number;
  remark?: string;
  createTime?: Date;
}

export interface DictTypeRequest {
  dictId?: number;
  dictName: string;
  dictType: string;
  status: number;
  remark?: string;
}

export interface DictDataQuery extends BasePageQuery {
  dictType?: string;
  dictLabel?: string;
  status?: number;
}

export interface DictDataDTO {
  dictCode?: number;
  dictType?: string;
  dictLabel?: string;
  dictValue?: string;
  dictSort?: number;
  isDefault?: number;
  cssClass?: string;
  listClass?: string;
  status?: number;
  remark?: string;
  createTime?: Date;
}

export interface DictDataRequest {
  dictCode?: number;
  dictType: string;
  dictLabel: string;
  dictValue: string;
  dictSort?: number;
  isDefault?: number;
  cssClass?: string;
  listClass?: string;
  status: number;
  remark?: string;
}

export const getDictTypeListApi = (params?: DictTypeQuery) => {
  return http.request<ResponseData<PageDTO<DictTypeDTO>>>(
    "get",
    "/system/dict/types",
    { params }
  );
};

export const getDictTypeInfoApi = (dictId: number) => {
  return http.request<ResponseData<DictTypeDTO>>(
    "get",
    `/system/dict/type/${dictId}`
  );
};

export const addDictTypeApi = (data: DictTypeRequest) => {
  return http.request<ResponseData<void>>("post", "/system/dict/type", {
    data
  });
};

export const updateDictTypeApi = (dictId: number, data: DictTypeRequest) => {
  return http.request<ResponseData<void>>(
    "put",
    `/system/dict/type/${dictId}`,
    { data }
  );
};

export const deleteDictTypeApi = (dictId: number) => {
  return http.request<ResponseData<void>>(
    "delete",
    `/system/dict/type/${dictId}`
  );
};

export const getDictDataListApi = (params?: DictDataQuery) => {
  return http.request<ResponseData<PageDTO<DictDataDTO>>>(
    "get",
    "/system/dict/data/list",
    { params }
  );
};

export const getDictDataByTypeApi = (dictType: string) => {
  return http.request<ResponseData<DictDataDTO[]>>(
    "get",
    `/system/dict/data/type/${dictType}`
  );
};

export const getDictDataInfoApi = (dictCode: number) => {
  return http.request<ResponseData<DictDataDTO>>(
    "get",
    `/system/dict/data/${dictCode}`
  );
};

export const addDictDataApi = (data: DictDataRequest) => {
  return http.request<ResponseData<void>>("post", "/system/dict/data", {
    data
  });
};

export const updateDictDataApi = (dictCode: number, data: DictDataRequest) => {
  return http.request<ResponseData<void>>(
    "put",
    `/system/dict/data/${dictCode}`,
    { data }
  );
};

export const deleteDictDataApi = (dictCode: number) => {
  return http.request<ResponseData<void>>(
    "delete",
    `/system/dict/data/${dictCode}`
  );
};
