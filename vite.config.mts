import dayjs from "dayjs";
import { resolve } from "path";
import type { ServerResponse } from "http";
import pkg from "./package.json";
import { wrapperEnv } from "./build";
import { getPluginsList } from "./build/plugins";
import { include, exclude } from "./build/optimize";
import {
  UserConfigExport,
  ConfigEnv,
  loadEnv,
  Plugin,
  PluginOption
} from "vite";

/** 当前执行node命令时文件夹的地址（工作目录） */
const root: string = process.cwd();

/** 路径查找 */
const pathResolve = (dir: string): string => {
  return resolve(__dirname, ".", dir);
};

/** 设置别名 */
const alias: Record<string, string> = {
  "@": pathResolve("src"),
  "@build": pathResolve("build")
};

const { dependencies, devDependencies, name, version } = pkg;
const __APP_INFO__ = {
  pkg: { dependencies, devDependencies, name, version },
  lastBuildTime: dayjs(new Date()).format("YYYY-MM-DD HH:mm:ss")
};

function sendDevConfigFallback(res: ServerResponse) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(
    JSON.stringify({
      code: 0,
      msg: "success",
      data: {
        isCaptchaOn: false,
        dictionary: {}
      }
    })
  );
}

function devConfigFallbackPlugin(): Plugin {
  return {
    name: "keystone:dev-config-fallback",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/api/getConfig", async (_req, res) => {
        try {
          const response = await fetch("http://localhost:18080/getConfig", {
            headers: {
              Accept: "application/json"
            }
          });
          const contentType = response.headers.get("content-type");
          const body = await response.text();

          res.statusCode = response.status;
          if (contentType) {
            res.setHeader("Content-Type", contentType);
          }
          res.end(body);
        } catch {
          sendDevConfigFallback(res);
        }
      });
    }
  };
}

export default ({ command, mode }: ConfigEnv): UserConfigExport => {
  const { VITE_CDN, VITE_PORT, VITE_COMPRESSION, VITE_PUBLIC_PATH } =
    wrapperEnv(loadEnv(mode, root));
  return {
    base: VITE_PUBLIC_PATH,
    root,
    resolve: {
      alias
    },
    // 服务端渲染
    server: {
      // 端口号
      port: VITE_PORT,
      host: "0.0.0.0",
      // 本地跨域代理 https://cn.vitejs.dev/config/server-options.html#server-proxy
      proxy: {
        "/api": {
          target: "http://localhost:18080",
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api/, "")
        },
        "/v3": {
          target: "http://localhost:18080",
          changeOrigin: true
        },
        "/swagger-ui": {
          target: "http://localhost:18080",
          changeOrigin: true
        },
        "/swagger-ui.html": {
          target: "http://localhost:18080",
          changeOrigin: true
        }
      }
    },
    plugins: [
      devConfigFallbackPlugin(),
      ...(getPluginsList(command, VITE_CDN, VITE_COMPRESSION) as PluginOption[])
    ],
    // https://cn.vitejs.dev/config/dep-optimization-options.html#dep-optimization-options
    optimizeDeps: {
      include,
      exclude
    },
    css: {
      preprocessorOptions: {
        scss: {
          silenceDeprecations: ["import"]
        }
      }
    },
    build: {
      sourcemap: false,
      // 消除打包大小超过500kb警告
      chunkSizeWarningLimit: 4000,
      rollupOptions: {
        input: {
          index: pathResolve("index.html")
        },
        // 静态资源分类打包
        output: {
          chunkFileNames: "static/js/[name]-[hash].js",
          entryFileNames: "static/js/[name]-[hash].js",
          assetFileNames: "static/[ext]/[name]-[hash].[ext]"
        }
      }
    },
    define: {
      __INTLIFY_PROD_DEVTOOLS__: false,
      __APP_INFO__: JSON.stringify(__APP_INFO__)
    }
  };
};
