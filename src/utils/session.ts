import { getConfig } from "@/config";
import { routerArrays } from "@/layout/types";
import { useAppStoreHook } from "@/store/modules/app";
import { useEpThemeStoreHook } from "@/store/modules/epTheme";
import { useMultiTagsStoreHook } from "@/store/modules/multiTags";
import { removeToken } from "@/utils/auth";
import { storageLocal, storageSession } from "@pureadmin/utils";

export function clearLoginSession(options: { clearStorage?: boolean } = {}) {
  removeToken();

  if (options.clearStorage) {
    storageLocal().clear();
    storageSession().clear();
    const { Grey, Weak, MultiTagsCache, EpThemeColor, Layout } = getConfig();
    useAppStoreHook().setLayout(Layout);
    useEpThemeStoreHook().setEpThemeColor(EpThemeColor);
    useMultiTagsStoreHook().multiTagsCacheChange(MultiTagsCache);
    document.querySelector("html")?.classList.toggle("html-grey", Grey);
    document.querySelector("html")?.classList.toggle("html-weakness", Weak);
    document.documentElement.style.setProperty(
      "--el-color-primary",
      EpThemeColor
    );
  }

  useMultiTagsStoreHook().handleTags("equal", [...routerArrays]);
  import("@/router").then(({ router, resetRouter }) => {
    resetRouter();
    router.push("/login");
  });
}
