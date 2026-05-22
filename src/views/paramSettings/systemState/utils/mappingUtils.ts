/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── 类型 ─────────────────────────────────────────────────────────────────────

type MapObj = Record<string, any>;
type DataRecord = Record<string, any>;
type UnmappedEntry = { extKey: string; extValue: string };

export type FieldLabelsResult = {
  mainModule: string;
  subModule: string;
  ext1: string;
  ext2: string;
  ext3: string;
  ext4: string;
  ext5: string;
};

// ─── 模块级常量（不依赖 data，只需初始化一次） ────────────────────────────────

const MAIN_MODULE_MAP: Record<string, string> = {
  "00": "摄像机",
  "01": "激光雷达",
  "02": "传感器",
  "03": "主机",
  "04": "模型",
  "05": "算法模块",
  "06": "检测软件框架",
  "07": "客户端",
  "08": "错误",
  "09": "船舶状态"
};

const EXT_ORDER = ["ext1", "ext2", "ext3", "ext4", "ext5"] as const;
type ExtKey = (typeof EXT_ORDER)[number];

// 常用 ext 枚举（只读，可被多处共享引用）
const EXT_OK_FAIL: MapObj = { "00": { name: "成功" }, "01": { name: "失败" } };
const EXT_OK_FAIL_SKIP: MapObj = { ...EXT_OK_FAIL, "02": { name: "无需连接" } };
const EXT_OK_FAIL_LOAD: MapObj = { ...EXT_OK_FAIL, "02": { name: "无需加载" } };
const EXT_OK_FAIL_NEED: MapObj = { ...EXT_OK_FAIL, "02": { name: "不需要" } };
const EXT_NORMAL_ABNORMAL: MapObj = {
  "00": { name: "正常" },
  "01": { name: "异常" }
};
const EXT_DEFAULT: MapObj = { "00": { name: "默认" } };

// 算法模块通用 ext1（主模块兜底 + 子模块 '10'/'11'/'12' 共用）
const ALGO_EXT1: MapObj = {
  "00": { name: "未开启" },
  "01": { name: "检测中" },
  "02": { name: "攀爬报警阈值配置错误" },
  "03": { name: "人员靠近船舷阈值配置错误" },
  "04": { name: "异常船只靠近报警阈值配置错误" },
  "05": { name: "海盗船警阈值配置错误" },
  "06": { name: "小船靠近阈值配置错误" },
  "07": { name: "上下船人数参数绘制错误" },
  "08": { name: "攀爬参数绘制错误" },
  "09": { name: "海盗船参数绘制错误" },
  "10": { name: "人员靠近船舷参数绘制错误" },
  "11": { name: "小船靠近参数绘制错误" },
  "12": { name: "小船靠近船长宽配置错误" },
  "101": { name: "船长人脸样本不存在" },
  "111": { name: "瞭望区域未配置" },
  "121": { name: "驾驶室值班人数不足区域未配置" }
};

// 算法子模块 '10'/'12' 共用 ext4
const ALGO_EXT4_INSPECT: MapObj = {
  "00": { name: "配置正确" },
  "01": { name: "存在相机中勾选了驻足，瞭望，海图，但未配置区域" },
  "02": { name: "人脸样本未被加载" },
  "03": { name: "人脸样本已被加载" }
};

// 算法子模块 '11'/'12' 共用 ext4
const ALGO_EXT4_AREA: MapObj = {
  "02": { name: "配置了区域" },
  "03": { name: "未配置区域" }
};

// ─── 模块级辅助函数（避免每次 replaceModuleData 调用重建） ──────────────────

function keyCandidates(val: unknown): string[] {
  if (val === null || val === undefined) return [""];
  const s = String(val);
  const noPad = s.replace(/^0+/, "") || s;
  const pad2 = s.length === 1 ? s.padStart(2, "0") : s;
  return Array.from(new Set([s, noPad, pad2]));
}

function findInMap(mapObj: MapObj | undefined, val: unknown): any {
  if (!mapObj || val === null || val === undefined) return undefined;
  for (const k of keyCandidates(val)) {
    if (Object.prototype.hasOwnProperty.call(mapObj, k)) return mapObj[k];
  }
  return undefined;
}

function resolveFromMap(
  mapObj: MapObj | undefined,
  candidates: string[]
): unknown {
  if (!mapObj) return undefined;
  for (const k of candidates) {
    if (Object.prototype.hasOwnProperty.call(mapObj, k)) {
      const found = mapObj[k];
      return found && typeof found === "object" && found.name
        ? found.name
        : found;
    }
  }
  return mapObj.name !== undefined ? mapObj.name : undefined;
}

// ─── 字段值映射 ───────────────────────────────────────────────────────────────

export function replaceModuleData(data: DataRecord): DataRecord {
  // moduleMap 中部分条目使用 { name: data.extX } 作为透传占位符（返回原始值），
  // 因此必须在函数内构建，不可提升为模块级常量。
  const moduleMap: MapObj = {
    "00": {
      // 摄像机
      subModule: { name: data.subModule },
      ext1: EXT_OK_FAIL,
      ext2: {
        "00": { name: "正常" },
        "01": { name: "无数据" },
        "02": { name: "相机移位" },
        "03": { name: "相机移位+黑屏" },
        "04": { name: "相机移位+被遮挡" },
        "05": { name: "相机黑屏" },
        "06": { name: "相机被遮挡" }
      },
      ext3: { name: data.ext3 },
      ext4: { name: data.ext4 },
      ext5: EXT_NORMAL_ABNORMAL
    },
    "01": {
      // 激光雷达
      subModule: { "00": { name: "左前" }, "01": { name: "右前" } },
      ext1: EXT_OK_FAIL,
      ext2: {
        "00": { name: "正常" },
        "01": { name: "无数据" },
        "02": { name: "帧率异常" }
      },
      ext3: { name: data.ext3 },
      ext4: { name: data.ext4 },
      ext5: EXT_NORMAL_ABNORMAL
    },
    "02": {
      // 传感器
      subModule: {
        "00": { name: "AIS" },
        "01": { name: "惯导" },
        "02": { name: "风速仪" },
        "03": { name: "罗经" },
        "04": { name: "计程仪" },
        "05": { name: "主机转速" },
        "06": { name: "舵角" },
        "07": { name: "测深仪" },
        "08": { name: "GPS" }
      },
      ext1: EXT_OK_FAIL_SKIP,
      ext2: {
        "00": { name: "正常" },
        "01": { name: "无数据" },
        "02": { name: "帧率异常" }
      },
      ext3: {
        "00": { name: "串口" },
        "01": { name: "网口" },
        "02": { name: "本地文件" },
        "03": { name: "其他" }
      },
      ext4: {
        "00": { name: "默认" },
        "01": { name: "长时间未收到本船AIS数据" }
      },
      ext5: EXT_DEFAULT
    },
    "03": {
      // 主机
      subModule: { "00": { name: "客户端" }, "01": { name: "服务器" } },
      ext1: EXT_NORMAL_ABNORMAL,
      ext2: {
        "00": { name: "CPU占用率" },
        "01": { name: "GPU占用率" },
        "02": { name: "CPU温度" },
        "03": { name: "磁盘空间占用情况" },
        "04": { name: "内存占用率" },
        "05": { name: "磁盘 IO 使用率" },
        "06": { name: "GPU 显存使用率" }
      },
      ext3: { name: data.ext3 },
      ext4: {
        "00": { name: "Linux" },
        "01": { name: "Win磁盘0" },
        "02": { name: "Win磁盘1" },
        "03": { name: "Win磁盘2" },
        "04": { name: "Win磁盘3" }
      },
      ext5: EXT_DEFAULT
    },
    "04": {
      // 模型
      subModule: {
        "00": { name: "一阶段模型(s)" },
        "01": { name: "二阶段模型(min)" },
        "02": { name: "分类模型(min)" },
        "03": { name: "校验模型(min)" },
        "04": { name: "Bisenet(min)" },
        "05": { name: "人脸识别(min)" }
      },
      ext1: EXT_OK_FAIL_LOAD,
      ext2: EXT_OK_FAIL,
      ext3: EXT_OK_FAIL,
      ext4: { name: data.ext4 },
      ext5: { name: data.ext5 }
    },
    "05": {
      // 算法模块
      mainModule: "功能模块",
      subModuleLabel: "子功能模块",
      subModule: {
        "00": {
          // 避碰预警
          name: "避碰预警",
          ext1: {
            "00": { name: "未开启" },
            "01": { name: "检测中" },
            "02": { name: "模块异常" }
          },
          ext2: { "00": { name: "避碰算法" }, "01": { name: "1海里记录" } },
          ext3: { name: data.ext3 },
          ext4: { name: data.ext4 },
          ext5: {
            "00": { name: "默认" },
            "01": { name: "AIS丢失" },
            "02": { name: "AIS避碰未开启" },
            "03": { name: "客户关闭报警" },
            "04": { name: "非开阔海域" },
            "05": { name: "航速异常" }
          }
        },
        "01": {
          // 增强瞭望
          name: "增强瞭望",
          ext1: {
            "00": { name: "未开启" },
            "01": { name: "正常检测中" },
            "02": { name: "瞭望镜头个数配置错误" },
            "03": { name: "瞭望相机高度配置错误" },
            "04": { name: "瞭望相机视场角配置错误" },
            "05": { name: "瞭望相机海天线绘制错误" }
          },
          ext2: { name: data.ext2 },
          ext3: { name: data.ext3 },
          ext4: { name: data.ext4 },
          ext5: { name: data.ext5 }
        },
        "02": { name: "辅助靠离泊" },
        "03": { name: "360拼接" },
        "10": {
          // 船长值班不规范
          name: "船长值班不规范",
          ext1: ALGO_EXT1,
          ext2: { name: data.ext2 },
          ext3: { name: data.ext3 },
          ext4: ALGO_EXT4_INSPECT,
          ext5: EXT_DEFAULT
        },
        "11": {
          // 瞭望不规范
          name: "瞭望不规范",
          ext1: ALGO_EXT1,
          ext2: { name: data.ext2 },
          ext3: { name: data.ext3 },
          ext4: ALGO_EXT4_AREA,
          ext5: EXT_DEFAULT
        },
        "12": {
          // 驾驶台值班人数不规范
          name: "驾驶台值班人数不规范",
          ext1: ALGO_EXT1,
          ext2: { name: data.ext2 },
          ext3: { name: data.ext3 },
          ext4: ALGO_EXT4_AREA,
          ext5: EXT_DEFAULT
        },
        "13": { name: "未佩戴安全帽" },
        "14": { name: "未穿工作服" },
        "04": { name: "上下船人数" },
        "15": { name: "攀爬" },
        "16": { name: "人员靠近船舷" },
        "17": { name: "疑似海盗船" },
        "19": { name: "小船靠近" },
        "20": { name: "异常行为" },
        "21": { name: "值班行为不规范" },
        "23": { name: "相机故障" },
        "24": { name: "望远镜检测" }
      },
      ext1: ALGO_EXT1,
      ext2: { name: data.ext2 },
      ext3: { name: data.ext3 },
      ext4: ALGO_EXT4_INSPECT,
      ext5: EXT_DEFAULT
    },
    "06": {
      // 检测软件框架
      subModule: {
        "00": {
          name: "通信",
          ext1: EXT_OK_FAIL_NEED,
          ext2: {
            "00": {
              name: "与船端平台连接（1883端口）",
              ext3: { name: data.ext3 },
              ext4: {
                "00": { name: "与代理服务器连接成功" },
                "01": { name: "与代理服务器连接失败" }
              },
              ext5: EXT_DEFAULT
            },
            "01": {
              name: "与船端平台连接（1884端口）",
              ext3: { name: data.ext3 },
              ext4: {
                "00": { name: "与代理服务器连接成功" },
                "01": { name: "与代理服务器连接失败" }
              },
              ext5: EXT_DEFAULT
            },
            "02": { name: "与中台连接状态" },
            "03": { name: "与航标连接状态" },
            "04": { name: "与审核软件连接状态" },
            "05": { name: "与岸端态势感知平台连接状态" },
            "06": { name: "数据库连接" },
            "07": { name: "与gpo连接状态" },
            "08": { name: "与kafka连接状态" }
          },
          ext3: { name: data.ext3 },
          ext4: EXT_DEFAULT,
          ext5: EXT_DEFAULT
        },
        "01": {
          name: "参数",
          ext1: { "00": { name: "正确" }, "01": { name: "错误" } },
          ext2: {
            "00": { name: "mmsi配置情况" },
            "01": { name: "岸端209服务器通信端口配置情况" },
            "02": { name: "ini文件测试状态参数" },
            "03": { name: "AlarmCond.json来源" },
            "04": { name: "检测软件版本" },
            "05": { name: "平台客户端版本" },
            "06": { name: "平台服务器版本" },
            "07": { name: "辅助靠泊模块版本" }
          },
          ext3: { name: data.ext3 },
          ext4: EXT_DEFAULT,
          ext5: EXT_DEFAULT
        }
      }
    },
    "07": {
      // 客户端
      subModule: {
        "00": {
          name: "通信",
          ext1: EXT_OK_FAIL,
          ext2: {
            "00": { name: "与服务器连接状态" },
            "01": { name: "与MQTT服务连接状态" },
            "02": { name: "360相机连接状态" }
          },
          ext3: EXT_DEFAULT,
          ext4: EXT_DEFAULT,
          ext5: EXT_DEFAULT
        },
        "01": {
          name: "算法模块",
          ext1: {
            "00": { name: "未开启" },
            "01": { name: "检测中" },
            "02": { name: "模块异常" }
          },
          ext2: { "00": { name: "激光检测模块调用状态" } },
          ext3: EXT_DEFAULT,
          ext4: EXT_DEFAULT,
          ext5: EXT_DEFAULT
        }
      }
    },
    "08": {}, // 错误
    "09": {
      // 船舶状态
      subModule: { "00": { name: "航行状态" } },
      ext1: EXT_NORMAL_ABNORMAL,
      ext2: {
        "00": { name: "经度" },
        "01": { name: "纬度" },
        "02": { name: "航速" },
        "03": {
          name: "航行状态",
          ext3: {
            "1": { name: "航行" },
            "2": { name: "靠泊" },
            "3": { name: "离泊" },
            "4": { name: "抛锚" },
            "5": { name: "搁浅" }
          },
          ext4: EXT_DEFAULT,
          ext5: EXT_DEFAULT
        },
        "04": {
          name: "所在区域",
          ext3: {
            "0": { name: "普通区域" },
            "1": { name: "中国邻海区域" },
            "2": { name: "特战区" },
            "3": { name: "六区一线" },
            "4": { name: "海盗区" },
            "5": { name: "特殊港口" },
            "6": { name: "狭水道" },
            "7": { name: "靠泊" },
            "8": { name: "离泊" },
            "9": { name: "复杂水域" },
            "10": { name: "普通区域" },
            "11": { name: "密集区域" },
            "12": { name: "AIS检测出的密集区域" }
          },
          ext4: EXT_DEFAULT,
          ext5: EXT_DEFAULT
        }
      },
      ext3: { name: data.ext3 },
      ext4: EXT_DEFAULT,
      ext5: EXT_DEFAULT
    }
  };

  // 创建数据副本
  const newData: DataRecord = { ...data };

  // 替换主模块
  if (MAIN_MODULE_MAP[data.mainModule]) {
    newData.mainModule = MAIN_MODULE_MAP[data.mainModule];
  }

  // 替换子模块（支持多种键形式）
  const mainCfgForSub = moduleMap[data.mainModule];
  if (mainCfgForSub?.subModule) {
    const subModuleMap = mainCfgForSub.subModule;
    const subFound = findInMap(subModuleMap, data.subModule);
    if (subFound && typeof subFound === "object" && subFound.name) {
      newData.subModule = subFound.name;
    } else if (subModuleMap?.name) {
      newData.subModule = subModuleMap.name;
    } else if (data.subModule !== undefined && data.subModule !== null) {
      newData.subModule = String(data.subModule);
    }
  }

  const unmappedCollector: UnmappedEntry[] = [];

  const replaceExtField = (extKey: ExtKey, extValue: unknown): string => {
    if (extValue === null || extValue === undefined) return "";
    const mainCfg: MapObj = moduleMap[data.mainModule] ?? {};
    const candidates = keyCandidates(extValue);

    // 解析 subCfg
    let subCfg: MapObj | undefined;
    if (mainCfg.subModule) {
      subCfg = findInMap(mainCfg.subModule, data.subModule);
      if (!subCfg && mainCfg.subModule.name) subCfg = mainCfg.subModule;
    }

    // 优先级：
    // 1) subCfg 内父级 ext 嵌套映射
    // 2) mainCfg 内父级 ext 嵌套映射
    // 3) subCfg 直接映射
    // 4) mainCfg 直接映射
    const extIdx = EXT_ORDER.indexOf(extKey as any);
    let foundNestedMap = false;

    if (extIdx > 0) {
      for (let i = extIdx - 1; i >= 0; i--) {
        const parentKey = EXT_ORDER[i];
        let nestedFound = false;

        if (subCfg) {
          const parentEntry = findInMap(subCfg[parentKey], data[parentKey]);
          if (
            parentEntry &&
            typeof parentEntry === "object" &&
            parentEntry[extKey]
          ) {
            foundNestedMap = nestedFound = true;
            const result = resolveFromMap(parentEntry[extKey], candidates);
            if (result !== undefined) return String(result);
          }
        }

        if (!nestedFound) {
          const parentEntry = findInMap(mainCfg[parentKey], data[parentKey]);
          if (
            parentEntry &&
            typeof parentEntry === "object" &&
            parentEntry[extKey]
          ) {
            foundNestedMap = nestedFound = true;
            const result = resolveFromMap(parentEntry[extKey], candidates);
            if (result !== undefined) return String(result);
          }
        }

        if (nestedFound) break;
      }
    }

    if (!foundNestedMap && subCfg) {
      const result = resolveFromMap(subCfg[extKey], candidates);
      if (result !== undefined) return String(result);
    }

    if (!foundNestedMap) {
      const result = resolveFromMap(mainCfg[extKey], candidates);
      if (result !== undefined) return String(result);
    }

    if (typeof extValue === "object" && (extValue as any).name) {
      return String((extValue as any).name);
    }

    const s = String(extValue);
    unmappedCollector.push({
      extKey,
      extValue: s.length === 1 ? s.padStart(2, "0") : s
    });
    return "";
  };

  newData.ext1 = replaceExtField("ext1", data.ext1);
  newData.ext2 = replaceExtField("ext2", data.ext2);
  newData.ext3 = replaceExtField("ext3", data.ext3);
  newData.ext4 = replaceExtField("ext4", data.ext4);
  newData.ext5 = replaceExtField("ext5", data.ext5);

  newData.fieldLabels = getFieldLabels(data.mainModule, data.subModule);

  if (unmappedCollector.length > 0) {
    newData._unmapped = unmappedCollector;
    console.debug("mappingUtils.unmapped", newData._unmapped);
  }

  return newData;
}

// ─── 字段标签 ─────────────────────────────────────────────────────────────────

// 算法模块大多数子模块共用相同标签
const ALGO_SUB_LABELS_DEFAULT = {
  mainModule: "功能模块",
  subModule: "子功能模块",
  ext1: "算法状态",
  ext2: "相机个数",
  ext3: "算法帧率",
  ext4: "扩展字段",
  ext5: "扩展字段"
};

const ALGO_DEFAULT_LABEL_IDS = [
  "02",
  "03",
  "04",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "19",
  "20",
  "21",
  "23",
  "24"
];

export function getFieldLabels(
  mainModule: string,
  subModule: string
): FieldLabelsResult {
  type LabelEntry = {
    mainModule?: string;
    subModule?: any;
    subModuleLabel?: string;
    ext1?: string;
    ext2?: string;
    ext3?: string;
    ext4?: string;
    ext5?: string;
    [key: string]: any;
  };

  const labelMap: Record<string, LabelEntry> = {
    "00": {
      mainModule: "模块名称",
      subModule: "相机编号",
      ext1: "连接状态",
      ext2: "数据状态",
      ext3: "帧间隔",
      ext4: "解码帧率",
      ext5: "帧率状态"
    },
    "01": {
      mainModule: "模块名称",
      subModule: "编号",
      ext1: "连接状态",
      ext2: "数据状态",
      ext3: "帧间隔",
      ext4: "解码帧率",
      ext5: "帧率状态"
    },
    "02": {
      mainModule: "硬件设备名称",
      subModule: "类型",
      ext1: "连接状态",
      ext2: "数据状态",
      ext3: "接入方式",
      ext4: "扩展字段",
      ext5: "扩展字段"
    },
    "03": {
      mainModule: "硬件设备名称",
      subModule: "主机类型",
      ext1: "硬件设备状态",
      ext2: "检测内容",
      ext3: "使用情况",
      ext4: "扩展字段",
      ext5: "扩展字段"
    },
    "04": {
      mainModule: "功能模块",
      subModule: "模型阶段",
      ext1: "加载状态",
      ext2: "初始化状态",
      ext3: "生成引擎状态",
      ext4: "推理帧率",
      ext5: "版本号"
    },
    "05": {
      mainModule: "功能模块",
      subModuleLabel: "子功能模块",
      subModule: {
        "00": {
          mainModule: "功能模块",
          subModule: "子功能模块",
          ext1: "算法状态",
          ext2: "细分功能",
          ext3: "tcpa",
          ext4: "dcpa",
          ext5: "扩展字段"
        },
        "01": {
          mainModule: "功能模块",
          subModule: "子功能模块",
          ext1: "算法状态",
          ext2: "相机个数",
          ext3: "相机编号",
          ext4: "帧率*最大目标个数*吃水",
          ext5: "瞭望相机视场角"
        },
        ...Object.fromEntries(
          ALGO_DEFAULT_LABEL_IDS.map(id => [id, ALGO_SUB_LABELS_DEFAULT])
        )
      }
    },
    "06": {
      mainModule: "功能模块",
      subModule: "子功能模块",
      ext1: "连接状态",
      ext2: "细分项",
      ext3: "详细信息",
      ext4: "扩展字段",
      ext5: "扩展字段"
    },
    "07": {
      mainModule: "功能模块",
      subModule: "子功能模块",
      ext1: "连接状态",
      ext2: "细分项",
      ext3: "扩展字段",
      ext4: "扩展字段",
      ext5: "扩展字段"
    },
    "09": {
      mainModule: "功能模块",
      subModule: "子功能模块",
      ext1: "状态",
      ext2: "字段描述",
      ext3: "数据信息",
      ext4: "扩展字段",
      ext5: "扩展字段"
    }
  };

  const getFieldLabel = (extKey: string): string => {
    const moduleCfg = labelMap[mainModule];
    if (!moduleCfg) return extKey;

    // subModule 标签优先用 subModuleLabel 避免与子模块映射对象冲突
    if (extKey === "subModule" && moduleCfg.subModuleLabel) {
      return moduleCfg.subModuleLabel;
    }

    // 子模块级别优先（细粒度）
    if (moduleCfg.subModule?.[subModule]?.[extKey]) {
      return moduleCfg.subModule[subModule][extKey];
    }

    // 主模块级别兜底
    if (moduleCfg[extKey]) return moduleCfg[extKey];

    return extKey;
  };

  return {
    mainModule: getFieldLabel("mainModule"),
    subModule: getFieldLabel("subModule"),
    ext1: getFieldLabel("ext1"),
    ext2: getFieldLabel("ext2"),
    ext3: getFieldLabel("ext3"),
    ext4: getFieldLabel("ext4"),
    ext5: getFieldLabel("ext5")
  };
}
