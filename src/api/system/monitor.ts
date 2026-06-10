import { http } from "@/utils/http";
import { getToken, formatToken } from "@/utils/auth";

const { VITE_APP_BASE_API } = import.meta.env;

const NETWORK_STATUS_STREAM_URL = `${(VITE_APP_BASE_API || "").replace(
  /\/$/,
  ""
)}/monitor/networkStatus/stream`;

export interface OnlineUserQuery {
  ipAddress: string;
  username: string;
}

export interface OnlineUserInfo {
  browser?: string;
  deptName?: string;
  ipAddress?: string;
  loginLocation?: string;
  loginTime?: number;
  operationSystem?: string;
  tokenId?: string;
  username?: string;
}

/** 获取操作日志列表 */
export const getOnlineUserListApi = (params?: OnlineUserQuery) => {
  return http.request<ResponseData<PageDTO<OnlineUserInfo>>>(
    "get",
    "/monitor/onlineUsers",
    {
      params
    }
  );
};

/** 强制登出用户 */
export const logoutOnlineUserApi = (tokenId: string) => {
  return http.request<ResponseData<void>>(
    "delete",
    `/monitor/onlineUser/${tokenId}`
  );
};

/**
 * ServerInfo
 */
export interface ServerInfo {
  cpuInfo?: CpuInfo;
  diskInfos?: DiskInfo[];
  jvmInfo?: JvmInfo;
  memoryInfo?: MemoryInfo;
  systemInfo?: SystemInfo;
}

/**
 * CpuInfo
 */
export interface CpuInfo {
  cpuNum?: number;
  free?: number;
  sys?: number;
  total?: number;
  used?: number;
  wait?: number;
}

/**
 * DiskInfo
 */
export interface DiskInfo {
  dirName?: string;
  free?: string;
  sysTypeName?: string;
  total?: string;
  typeName?: string;
  usage?: number;
  used?: string;
}

/**
 * JvmInfo
 */
export interface JvmInfo {
  free?: number;
  home?: string;
  inputArgs?: string;
  max?: number;
  name?: string;
  runTime?: string;
  startTime?: string;
  total?: number;
  usage?: number;
  used?: number;
  version?: string;
}

/**
 * MemoryInfo
 */
export interface MemoryInfo {
  free?: number;
  total?: number;
  usage?: number;
  used?: number;
}

/**
 * SystemInfo
 */
export interface SystemInfo {
  computerIp?: string;
  computerName?: string;
  osArch?: string;
  osName?: string;
  userDir?: string;
}

export interface NetworkTargetStatus {
  name?: string;
  url?: string;
  connected?: boolean;
  statusCode?: number;
  latencyMillis?: number;
  message?: string;
}

export interface NetworkStatus {
  online?: boolean;
  status?: "ONLINE" | "OFFLINE";
  checkedAt?: string;
  targets?: NetworkTargetStatus[];
}

export interface NetworkStatusStreamOptions {
  onMessage: (data: NetworkStatus) => void;
  onError?: (error: unknown) => void;
}

function parseSseEvent(rawEvent: string) {
  const event = {
    name: "",
    data: ""
  };
  const dataLines: string[] = [];

  rawEvent.split(/\r?\n/).forEach(line => {
    if (line.startsWith("event:")) {
      event.name = line.slice("event:".length).trim();
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trimStart());
    }
  });

  event.data = dataLines.join("\n");
  return event;
}

function wait(ms: number) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

async function openNetworkStatusStream(
  controller: AbortController,
  options: NetworkStatusStreamOptions
) {
  const token = getToken()?.token;
  if (!token) {
    throw new Error("登录状态已过期，请重新登录");
  }

  const response = await fetch(NETWORK_STATUS_STREAM_URL, {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "text/event-stream",
      Authorization: formatToken(token)
    },
    signal: controller.signal
  });

  if (!response.ok || !response.body) {
    throw new Error(`SSE连接失败：${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (!controller.signal.aborted) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() || "";

    events.forEach(rawEvent => {
      const event = parseSseEvent(rawEvent);
      if (event.name === "network-status" && event.data) {
        options.onMessage(JSON.parse(event.data) as NetworkStatus);
      }
    });
  }
}

export function connectNetworkStatusStream(
  options: NetworkStatusStreamOptions
) {
  const controller = new AbortController();
  let closed = false;

  async function connectLoop() {
    while (!closed) {
      try {
        await openNetworkStatusStream(controller, options);
      } catch (error) {
        if (!closed && !controller.signal.aborted) {
          options.onError?.(error);
        }
      }

      if (!closed && !controller.signal.aborted) {
        await wait(3000);
      }
    }
  }

  void connectLoop();

  return {
    close() {
      closed = true;
      controller.abort();
    }
  };
}

/** 获取服务器信息 */
export const getServerInfoApi = () => {
  return http.request<ResponseData<ServerInfo>>("get", "/monitor/serverInfo");
};

/**
 * RedisCacheInfoDTO
 */
export interface RedisCacheInfoDTO {
  commandStats?: CommandStatusDTO[];
  dbSize?: number;
  info?: { [key: string]: string };
}

/**
 * CommandStatusDTO
 */
export interface CommandStatusDTO {
  name?: string;
  value?: string;
}

/** 获取Redis信息 */
export const getCacheInfoApi = () => {
  return http.request<ResponseData<ServerInfo>>("get", "/monitor/cacheInfo");
};
