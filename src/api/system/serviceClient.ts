import { http } from "@/utils/http";

export interface ServiceClientRequest {
  serviceId: string;
  serviceSecret: string;
  name: string;
  description?: string;
  allowedScopes: string[];
  allowedAudiences: string[];
  integrationType?: string;
  introspectionAllowed?: boolean;
  tokenTtlSeconds?: number;
  owner?: string;
  contact?: string;
}

export interface ServiceClientQuery extends BasePageQuery {
  serviceId?: string;
  name?: string;
  active?: boolean;
  integrationType?: string;
}

export interface UpdateServiceClientRequest {
  name: string;
  description?: string;
  allowedScopes: string[];
  allowedAudiences: string[];
  active?: boolean;
  integrationType?: string;
  introspectionAllowed?: boolean;
  tokenTtlSeconds?: number;
  owner?: string;
  contact?: string;
}

export interface ServiceClientDTO {
  serviceId: string;
  name?: string;
  description?: string;
  allowedScopes?: string[];
  allowedAudiences?: string[];
  active?: boolean;
  integrationType?: string;
  introspectionAllowed?: boolean;
  tokenTtlSeconds?: number;
  owner?: string;
  contact?: string;
  createdAt?: number;
  updatedAt?: number;
  message?: string;
}

export const getServiceClientListApi = (params?: ServiceClientQuery) => {
  return http.request<ResponseData<PageDTO<ServiceClientDTO>>>(
    "get",
    "/system/service-clients",
    {
      params
    }
  );
};

export const getServiceClientDetailApi = (serviceId: string) => {
  return http.request<ResponseData<ServiceClientDTO>>(
    "get",
    `/system/service-clients/${serviceId}`
  );
};

export const addServiceClientApi = (data: ServiceClientRequest) => {
  return http.request<ResponseData<ServiceClientDTO>>(
    "post",
    "/system/service-clients",
    {
      data
    }
  );
};

export const updateServiceClientApi = (
  serviceId: string,
  data: UpdateServiceClientRequest
) => {
  return http.request<ResponseData<ServiceClientDTO>>(
    "put",
    `/system/service-clients/${serviceId}`,
    {
      data
    }
  );
};
