import Cookies from "js-cookie";
import { storageSession } from "@pureadmin/utils";
import { aesEncrypt, aesDecrypt } from "@/utils/crypt";
import type { TokenDTO } from "@/api/common/login";

/**
 * 原版前端token实现
 */
export interface DataInfo<T> {
  /** token */
  accessToken: string;
  /** `accessToken`的过期时间（时间戳） */
  expires: T;
  /** 用于调用刷新accessToken的接口时所需的token */
  refreshToken: string;
  /** 用户名 */
  username?: string;
  /** 当前登陆用户的角色 */
  roles?: Array<string>;
}

export const sessionKey = "user-info";
export const tokenKey = "authorized-token";
export const isRememberMeKey = "ag-is-remember-me";
export const passwordKey = "ag-password";

/** 获取`token` */
export function getToken(): TokenDTO {
  // 此处与`TokenKey`相同，此写法解决初始化时`Cookies`中不存在`TokenKey`报错
  return Cookies.get(tokenKey)
    ? JSON.parse(Cookies.get(tokenKey))
    : storageSession().getItem<TokenDTO>(sessionKey);
}

export function getRefreshToken(): string {
  return getToken()?.refreshToken;
}

/**
 * 后端处理token
 */
export function setTokenFromBackend(data: TokenDTO): void {
  const currentToken = getToken();
  const mergedToken = {
    ...currentToken,
    ...data,
    currentUser: data.currentUser ?? currentToken?.currentUser
  } as TokenDTO;
  const cookieString = JSON.stringify(mergedToken);
  Cookies.set(tokenKey, cookieString);
  storageSession().setItem(sessionKey, mergedToken);
}

/** 兼容旧版单点登录参数写入 */
export function setToken(data: DataInfo<Date>): void {
  const legacyToken: any = {
    token: {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expires: data.expires
    },
    currentUser: {
      roleKey: Array.isArray(data.roles) ? data.roles[0] ?? "" : "",
      userInfo: {
        username: data.username ?? ""
      }
    }
  };

  Cookies.set(tokenKey, JSON.stringify(legacyToken));
  storageSession().setItem(sessionKey, legacyToken as TokenDTO);
}

/** 删除`token`以及key值为`user-info`的session信息 */
export function removeToken() {
  Cookies.remove(tokenKey);
  sessionStorage.clear();
}

/** 将密码加密后 存入cookies中 */
export function savePassword(password: string) {
  const encryptPassword = aesEncrypt(password);
  Cookies.set(passwordKey, encryptPassword);
}

/** 将密码中cookies中删除 */
export function removePassword() {
  Cookies.remove(passwordKey);
}

/** 获取密码 并解密 */
export function getPassword(): string {
  const encryptPassword = Cookies.get(passwordKey);
  if (
    encryptPassword !== null &&
    encryptPassword !== undefined &&
    encryptPassword.trim() !== ""
  ) {
    return aesDecrypt(encryptPassword);
  }
  return null;
}

export function saveIsRememberMe(isRememberMe: boolean) {
  Cookies.set(isRememberMeKey, isRememberMe.toString());
}

export function getIsRememberMe() {
  const value = Cookies.get(isRememberMeKey);
  return value === "true";
}

/** 格式化token（jwt格式） */
export const formatToken = (token: string): string => {
  return "Bearer " + token;
};
