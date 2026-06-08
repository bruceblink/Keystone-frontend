import { defineStore } from "pinia";
import { store } from "@/store";
import type { DictionaryList, userType } from "./types";
import { storageLocal, storageSession } from "@pureadmin/utils";
import { sessionKey } from "@/utils/auth";
import {
  type DictionaryData,
  type TokenDTO,
  logout as logoutApi,
  logoutRefreshToken
} from "@/api/common/login";
import { clearLoginSession } from "@/utils/session";
import { getRefreshToken } from "@/utils/auth";

const dictionaryListKey = "ag-dictionary-list";
const dictionaryMapKey = "ag-dictionary-map";

type DictionarySource =
  | Map<string, DictionaryData[]>
  | Record<string, DictionaryData[]>
  | undefined
  | null;

function normalizeDictionaryList(dictionary: DictionarySource): DictionaryList {
  const entries =
    dictionary instanceof Map
      ? dictionary.entries()
      : Object.entries(dictionary ?? {});

  return Array.from(entries).reduce((listMap, [key, list]) => {
    listMap[String(key)] = Array.isArray(list) ? list : [];
    return listMap;
  }, {} as DictionaryList);
}

function buildDictionaryMap(dictionaryList: DictionaryList) {
  return Object.entries(dictionaryList).reduce((mapMap, [key, list]) => {
    mapMap[key] = list.reduce((map, dict) => {
      map[String(dict.value)] = dict;
      return map;
    }, {} as Record<string, DictionaryData>);
    return mapMap;
  }, {} as Record<string, Record<string, DictionaryData>>);
}

function buildDictionaryList(
  dictionaryMap: Record<string, Record<string, DictionaryData>>
): DictionaryList {
  return Object.entries(dictionaryMap).reduce((listMap, [key, map]) => {
    listMap[key] = Object.values(map);
    return listMap;
  }, {} as DictionaryList);
}

export const useUserStore = defineStore({
  id: "ag-user",
  state: (): userType => {
    const tokenData = storageSession().getItem<TokenDTO>(sessionKey);
    const storedDictionaryMap =
      storageLocal().getItem<Record<string, Record<string, DictionaryData>>>(
        dictionaryMapKey
      ) ?? {};
    const storedDictionaryList = normalizeDictionaryList(
      storageLocal().getItem<DictionarySource>(dictionaryListKey)
    );
    const dictionaryList = Object.keys(storedDictionaryList).length
      ? storedDictionaryList
      : buildDictionaryList(storedDictionaryMap);

    return {
      // 用户名
      username: tokenData?.currentUser.userInfo.username ?? "",
      // 页面级别权限
      roles: tokenData?.currentUser.roleKey
        ? [tokenData.currentUser.roleKey]
        : [],
      dictionaryList,
      dictionaryMap: Object.keys(storedDictionaryMap).length
        ? storedDictionaryMap
        : buildDictionaryMap(dictionaryList),
      verifyCode: "",
      currentUserInfo: tokenData?.currentUser.userInfo ?? {}
    };
  },
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
    /** 存储系统内的字典值，并拆分为列表和按值索引的对象 */
    SET_DICTIONARY(dictionary: DictionarySource) {
      const dictionaryListTmp = normalizeDictionaryList(dictionary);
      const dictionaryMapTmp = buildDictionaryMap(dictionaryListTmp);

      this.dictionaryList = dictionaryListTmp;
      this.dictionaryMap = dictionaryMapTmp;

      storageLocal().setItem<DictionaryList>(
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
