import Axios, {
  AxiosInstance,
  AxiosRequestConfig,
  CustomParamsSerializer
} from "axios";
import {
  PureHttpError,
  RequestMethods,
  PureHttpResponse,
  PureHttpRequestConfig
} from "./types.d";
import type { TokenDTO } from "@/api/common/login";
import { stringify } from "qs";
import NProgress from "../progress";
import {
  getRefreshToken,
  getToken,
  formatToken,
  setTokenFromBackend
} from "@/utils/auth";
import { message } from "../message";
import { clearLoginSession } from "@/utils/session";
import { downloadByData } from "@pureadmin/utils";
// console.log("Utils:" + router);

const { VITE_APP_BASE_API } = import.meta.env;
const AUTH_ERROR_CODES = [106, 107, 108];
const AUTH_HTTP_STATUSES = [401, 403];
const AUTH_WHITE_LIST = [
  "/refresh-token",
  "/logout-refresh-token",
  "/login",
  "/login/rsa-public-key",
  "/captchaImage",
  "/getConfig"
];
// 相关配置请参考：www.axios-js.com/zh-cn/docs/#axios-request-config-1
const defaultConfig: AxiosRequestConfig = {
  // 请求超时时间
  timeout: 10000,
  // 后端请求地址
  baseURL: VITE_APP_BASE_API,
  headers: {
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest"
  },
  // 数组格式参数序列化（https://github.com/axios/axios/issues/5142）
  paramsSerializer: {
    serialize: stringify as unknown as CustomParamsSerializer
  }
};

class PureHttp {
  constructor() {
    this.httpInterceptorsRequest();
    this.httpInterceptorsResponse();
  }

  /** 初始化配置对象 */
  private static initConfig: PureHttpRequestConfig = {};

  /** 保存当前Axios实例对象 */
  private static axiosInstance: AxiosInstance = Axios.create(defaultConfig);

  /** 不挂载业务拦截器，专用于 refresh token */
  private static refreshAxiosInstance: AxiosInstance =
    Axios.create(defaultConfig);

  /** 防止并发请求重复触发登录态清理 */
  private static isRedirectingToLogin = false;

  /** 正在进行的刷新任务，用于单飞刷新 */
  private static refreshTask: Promise<string> | null = null;

  /** 请求拦截 */
  private httpInterceptorsRequest(): void {
    PureHttp.axiosInstance.interceptors.request.use(
      async (config: PureHttpRequestConfig): Promise<any> => {
        // 开启进度条动画
        NProgress.start();
        // 优先判断post/get等方法是否传入回调，否则执行初始化设置等回调
        if (typeof config.beforeRequestCallback === "function") {
          config.beforeRequestCallback(config);
          return config;
        }
        if (PureHttp.initConfig.beforeRequestCallback) {
          PureHttp.initConfig.beforeRequestCallback(config);
          return config;
        }
        /** 请求白名单，放置一些不需要token的接口（通过设置请求白名单，防止token过期后再请求造成的死循环问题） */
        const isWhiteListed = PureHttp.isWhiteListed(config.url);
        return isWhiteListed
          ? config
          : new Promise((resolve, reject) => {
              const data = getToken();
              if (!data?.token) {
                PureHttp.redirectToLoginOnAuthError();
                reject(new Error("登录状态已过期，请重新登录"));
                return;
              }
              config.headers["Authorization"] = formatToken(data.token);
              resolve(config);
            });
      },
      error => {
        NProgress.done();
        return Promise.reject(error);
      }
    );
  }

  private static redirectToLoginOnAuthError(msg?: string) {
    if (!PureHttp.isRedirectingToLogin) {
      PureHttp.isRedirectingToLogin = true;
      message(msg || "登录状态已过期，请重新登录", { type: "warning" });
      clearLoginSession();
      setTimeout(() => {
        PureHttp.isRedirectingToLogin = false;
      }, 1000);
    }
  }

  private static isWhiteListed(url?: string) {
    return AUTH_WHITE_LIST.some(v => url?.endsWith(v));
  }

  private static shouldRefresh(config?: PureHttpRequestConfig) {
    return (
      Boolean(config?.url) &&
      !config?._retry &&
      !PureHttp.isWhiteListed(config.url)
    );
  }

  private static getRequestErrorMessage(error: PureHttpError) {
    if (Axios.isCancel(error)) {
      return "";
    }

    const status = error.response?.status;
    if (typeof status === "number") {
      if (status >= 500) {
        return "服务器异常，请稍后重试";
      }

      if (status >= 400) {
        return "请求接口不存在或无访问权限";
      }
    }

    if (
      error.code === "ECONNABORTED" ||
      error.message?.toLowerCase().includes("timeout")
    ) {
      return "请求超时，请检查后端服务或网络连接";
    }

    if (!error.response) {
      return "后端服务不可用，请检查服务是否启动或网络连接";
    }

    return error.message || "网络异常";
  }

  private static async refreshAccessToken(): Promise<string> {
    if (PureHttp.refreshTask) {
      return PureHttp.refreshTask;
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw new Error("refresh token missing");
    }

    PureHttp.refreshTask = PureHttp.refreshAxiosInstance
      .request<ResponseData<TokenDTO>>({
        method: "post",
        url: "/refresh-token",
        data: { refreshToken }
      })
      .then(response => {
        const responseData = response.data;
        if (
          AUTH_ERROR_CODES.includes(responseData.code) ||
          responseData.code !== 0
        ) {
          throw new Error(responseData.msg || "refresh token failed");
        }
        setTokenFromBackend(responseData.data);
        return responseData.data.token;
      })
      .finally(() => {
        PureHttp.refreshTask = null;
      });

    return PureHttp.refreshTask;
  }

  private static async retryWithRefreshedToken(
    config: PureHttpRequestConfig
  ): Promise<any> {
    const token = await PureHttp.refreshAccessToken();
    config.headers = config.headers || {};
    config.headers["Authorization"] = formatToken(token);
    config._retry = true;
    return PureHttp.axiosInstance.request(config);
  }

  /** 响应拦截 */
  private httpInterceptorsResponse(): void {
    const instance = PureHttp.axiosInstance;
    instance.interceptors.response.use(
      async (response: PureHttpResponse) => {
        let code = undefined;
        let msg = undefined;

        // 后台返回的二进制流
        if (response.data instanceof Blob) {
          // 返回二进制流的时候 可能出错  这时候返回的错误是Json格式
          if (response.data.type === "application/json") {
            const text = await this.readBlobAsText(response.data);
            const json = JSON.parse(text);
            // 提取错误消息中的code和msg
            code = json.code;
            msg = json.msg;
          } else {
            NProgress.done();
            return response.data;
          }
          // 正常的返回类型 直接获取code和msg字段
        } else {
          /** 修改*/
          const $config = response.config;
          // 自定义响应回调时跳过全局 code 校验（如设备接口 code 为 200）
          if (typeof $config.beforeResponseCallback === "function") {
            NProgress.done();
            $config.beforeResponseCallback(response);
            return response.data;
          }
          if (PureHttp.initConfig.beforeResponseCallback) {
            NProgress.done();
            PureHttp.initConfig.beforeResponseCallback(response);
            return response.data;
          }
          /** 结束 */
          code = response.data.code;
          msg = response.data.msg;
        }

        // 如果不存在code说明后端格式有问题
        if (!code) {
          msg = "服务器返回数据结构有误";
        }

        // 请求返回失败时，有业务错误时，弹出错误提示
        if (code !== 0) {
          if (AUTH_ERROR_CODES.includes(code)) {
            if (PureHttp.shouldRefresh(response.config)) {
              try {
                return await PureHttp.retryWithRefreshedToken(response.config);
              } catch {
                PureHttp.redirectToLoginOnAuthError(msg);
              }
            } else {
              PureHttp.redirectToLoginOnAuthError(msg);
            }
          } else {
            message(msg, { type: "error" });
          }
          NProgress.done();
          return Promise.reject({ code, msg });
        }

        /** 修改 */
        // const $config = response.config;
        // 关闭进度条动画
        NProgress.done();
        // 优先判断post/get等方法是否传入回调，否则执行初始化设置等回调
        // if (typeof $config.beforeResponseCallback === "function") {
        //   $config.beforeResponseCallback(response);
        //   return response.data;
        // }
        // if (PureHttp.initConfig.beforeResponseCallback) {
        //   PureHttp.initConfig.beforeResponseCallback(response);
        //   return response.data;
        // }
        return response.data;
      },
      async (error: PureHttpError) => {
        const $error = error;
        $error.isCancelRequest = Axios.isCancel($error);
        // 关闭进度条动画
        NProgress.done();
        if (
          $error.response &&
          AUTH_HTTP_STATUSES.includes($error.response.status)
        ) {
          if (PureHttp.shouldRefresh($error.config)) {
            try {
              return await PureHttp.retryWithRefreshedToken($error.config);
            } catch {
              PureHttp.redirectToLoginOnAuthError($error.response.statusText);
            }
          } else {
            PureHttp.redirectToLoginOnAuthError($error.response.statusText);
          }
        }
        // 所有的响应异常 区分来源为取消请求/非取消请求
        return Promise.reject($error);
      }
    );
  }

  /** 通用请求工具函数 */
  public request<T>(
    method: RequestMethods,
    url: string,
    param?: AxiosRequestConfig,
    axiosConfig?: PureHttpRequestConfig
  ): Promise<T> {
    const config = {
      method,
      url,
      ...param,
      ...axiosConfig
    } as PureHttpRequestConfig;

    // 单独处理自定义请求/响应回调
    return new Promise((resolve, reject) => {
      PureHttp.axiosInstance
        .request(config)
        .then((response: undefined) => {
          resolve(response);
        })
        .catch(error => {
          if (!Axios.isAxiosError(error)) {
            reject(error);
            return;
          }

          if (
            error.response &&
            AUTH_HTTP_STATUSES.includes(error.response.status)
          ) {
            reject(error);
            return;
          }

          const errorMessage = PureHttp.getRequestErrorMessage(error);
          if (errorMessage) {
            message(errorMessage, { type: "error", grouping: true });
          }

          reject(error);
        });
    });
  }

  /** 从二进制流中读取文本 */
  async readBlobAsText(blob: Blob): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        resolve(text);
      };
      reader.onerror = reject;
      reader.readAsText(blob, "UTF-8");
    });
  }

  /** 单独抽离的post工具函数 */
  public post<T, P>(
    url: string,
    params?: AxiosRequestConfig<T>,
    config?: PureHttpRequestConfig
  ): Promise<P> {
    return this.request<P>("post", url, params, config);
  }

  /** 单独抽离的get工具函数 */
  public get<T, P>(
    url: string,
    params?: AxiosRequestConfig<T>,
    config?: PureHttpRequestConfig
  ): Promise<P> {
    return this.request<P>("get", url, params, config);
  }

  /** download文件方法 从后端获取文件流 */
  public download(
    url: string,
    fileName: string,
    params?: AxiosRequestConfig
  ): void {
    this.get(url, params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      responseType: "blob"
    }).then((data: Blob) => {
      downloadByData(data, fileName);
    });
  }

  // .post(url, params, {
  //   transformRequest: [params => encodeURIParams(params)],
  //   headers: { "Content-Type": "application/x-www-form-urlencoded" },
  //   responseType: "blob"
  // })
  // .then(async data => {
  //   const isLogin = await isBlobData(data);
  //   if (isLogin) {
  //     const blob = new Blob([data]);
  //     saveAs(blob, filename);
  //   } else {
  //     const resText = await data.text();
  //     const rspObj = JSON.parse(resText);
  //     const errMsg =
  //       errorCode[rspObj.code] || rspObj.msg || errorCode.default;
  //     ElMessage.error(errMsg);
  //   }
  //   downloadLoadingInstance.close();
  // })
  // .catch(r => {
  //   console.error(r);
  //   ElMessage.error("下载文件出现错误，请联系管理员！");
  //   downloadLoadingInstance.close();
  // });

  // axios
  //   .get("https://pure-admin.github.io/pure-admin-doc/img/pure.png", {
  //     responseType: "blob"
  //   })
  //   .then(({ data }) => {
  //     downloadByData(data, "test-data.png");
  //   });
  // }
}

export const http = new PureHttp();
