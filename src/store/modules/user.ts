import { defineStore } from "pinia";
import { store } from "@/store";
import { userType } from "./types";
import { storageLocal, storageSession } from "@pureadmin/utils";
import { sessionKey } from "@/utils/auth";
import {
  DictionaryData,
  TokenDTO,
  logout as logoutApi,
  logoutRefreshToken
} from "@/api/common/login";
import { clearLoginSession } from "@/utils/session";
import { getRefreshToken } from "@/utils/auth";

const dictionaryListKey = "ag-dictionary-list";
const dictionaryMapKey = "ag-dictionary-map";

export const useUserStore = defineStore({
  id: "ag-user",
  state: (): userType => ({
    // 用户名
    username:
      storageSession().getItem<TokenDTO>(sessionKey)?.currentUser.userInfo
        .username ?? "",
    // 页面级别权限
    roles: storageSession().getItem<TokenDTO>(sessionKey)?.currentUser.roleKey
      ? [storageSession().getItem<TokenDTO>(sessionKey)?.currentUser.roleKey]
      : [],
    dictionaryList:
      storageLocal().getItem<Map<string, DictionaryData[]>>(
        dictionaryListKey
      ) ?? new Map(),
    dictionaryMap:
      storageLocal().getItem<Record<string, Record<string, DictionaryData>>>(
        dictionaryMapKey
      ) ?? {},
    verifyCode: "",
    currentUserInfo:
      storageSession().getItem<TokenDTO>(sessionKey)?.currentUser.userInfo ?? {}
  }),
  actions: {
    /** 存储用户名 */
    SET_USERNAME(username: string) {
      /** TODO 这里不是应该再进一步存到sessionStorage中吗 */
      this.username = username;
    },
    /** 存储角色 */
    SET_ROLES(roles: Array<string>) {
      this.roles = roles;
    },
    /** 存储系统内的字典值 并拆分为Map形式和List形式 */
    SET_DICTIONARY(
      dictionary:
        | Map<string, DictionaryData[]>
        | Record<string, DictionaryData[]>
        | undefined
    ) {
      const dictionaryEntries =
        dictionary instanceof Map
          ? dictionary.entries()
          : Object.entries(dictionary ?? {});
      /** 由于localStorage不能存储Map对象,所以用Obj来装载数据 */
      const dictionaryMapTmp: Record<
        string,
        Record<string, DictionaryData>
      > = {};
      const dictionaryListTmp = new Map<string, DictionaryData[]>();

      for (const [key, list] of dictionaryEntries) {
        dictionaryListTmp.set(String(key), list || []);
        dictionaryMapTmp[String(key)] = (list || []).reduce((map, dict) => {
          map[String(dict.value)] = dict;
          return map;
        }, {} as Record<string, DictionaryData>);
      }

      /** 将字典分成List形式和Map形式 List便于下拉框展示 Map便于匹配值 */
      this.dictionaryList = dictionaryListTmp;
      this.dictionaryMap = dictionaryMapTmp;

      storageLocal().setItem<Map<string, DictionaryData[]>>(
        dictionaryListKey,
        dictionaryListTmp
      );

      storageLocal().setItem<Record<string, Record<string, DictionaryData>>>(
        dictionaryMapKey,
        dictionaryMapTmp
      );
    },

    /** 登出 */
    async logOut(options: { clearStorage?: boolean } = {}) {
      const refreshToken = getRefreshToken();
      try {
        await logoutApi();
      } catch {
        if (refreshToken) {
          await logoutRefreshToken({ refreshToken }).catch(() => undefined);
        }
      } finally {
        this.clearLoginState(options);
      }
    },

    /** 清理登录态并返回登录页 */
    clearLoginState(options: { clearStorage?: boolean } = {}) {
      this.username = "";
      this.roles = [];
      clearLoginSession(options);
    }
  }
});

export function useUserStoreHook() {
  return useUserStore(store);
}
