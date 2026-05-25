import { http } from "@/utils/http";
import type { PureHttpRequestConfig } from "@/utils/http/types.d";

export type MqttPublishWithResponseDTO = {
  publishTopic: string;
  message: string;
  deviceId: string;
  publishQosLevel?: string;
  responseQosLevel?: string;
  timeoutSeconds?: number;
};

export type MqttRawResponse = {
  code?: number;
  statuscode?: number;
  success?: boolean;
  message?: string;
  data?: unknown;
  response?: string;
  [key: string]: unknown;
};

const rawApiConfig: PureHttpRequestConfig = {
  beforeResponseCallback: () => {}
};

export const postMqttPublishWithResponse = (
  payload: MqttPublishWithResponseDTO
): Promise<MqttRawResponse> => {
  return http
    .request<MqttRawResponse>(
      "post",
      "/api/mqtt/publish-with-response",
      { data: payload },
      rawApiConfig
    )
    .then(raw => raw as MqttRawResponse);
};
