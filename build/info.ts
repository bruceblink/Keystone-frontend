import type { Plugin } from "vite";
import dayjs, { Dayjs } from "dayjs";
import { join } from "path";
import { readdir, stat } from "fs/promises";
import duration from "dayjs/plugin/duration";
import picocolors from "picocolors";
dayjs.extend(duration);

const { green, blue, bold } = picocolors;

async function getDirectorySize(folder: string): Promise<number> {
  let total = 0;
  const entries = await readdir(folder);

  for (const entry of entries) {
    const entryPath = join(folder, entry);
    const entryStat = await stat(entryPath);

    if (entryStat.isDirectory()) {
      total += await getDirectorySize(entryPath);
    } else if (entryStat.isFile()) {
      total += entryStat.size;
    }
  }

  return total;
}

function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";

  const unit = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const index = Math.floor(Math.log(bytes) / Math.log(unit));

  return `${parseFloat((bytes / Math.pow(unit, index)).toFixed(decimals))} ${
    sizes[index]
  }`;
}

export function viteBuildInfo(): Plugin {
  let config: { command: string };
  let startTime: Dayjs;
  let endTime: Dayjs;
  let outDir: string;
  return {
    name: "vite:buildInfo",
    configResolved(resolvedConfig) {
      config = resolvedConfig;
      outDir = resolvedConfig.build?.outDir ?? "dist";
    },
    buildStart() {
      console.log(
        bold(
          green(
            `👏  欢迎使用${blue(
              "[Agileboot全栈项目]"
            )}，如果您感觉不错，记得点击后面链接给个star哦💖  https://github.com/bruceblink/agileboot-back-end`
          )
        )
      );
      if (config.command === "build") {
        startTime = dayjs(new Date());
      }
    },
    async closeBundle() {
      if (config.command === "build") {
        endTime = dayjs(new Date());
        const size = formatBytes(await getDirectorySize(outDir));

        console.log(
          bold(
            green(
              `🎉恭喜打包完成（总用时${dayjs
                .duration(endTime.diff(startTime))
                .format("mm分ss秒")}，打包后的大小为${size}）`
            )
          )
        );
      }
    }
  };
}
