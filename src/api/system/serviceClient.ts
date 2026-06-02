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

export interface ServiceClientDTO {
  serviceId: string;
  message: string;
}

export const addServiceClientApi = (data: ServiceClientRequest) => {
  return http.request<ResponseData<ServiceClientDTO>>(
    "post",
    "/system/service-clients",
    {
      data
    }
  );
};
