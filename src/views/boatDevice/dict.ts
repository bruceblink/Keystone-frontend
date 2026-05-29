/**
 * boatDevice 模块公共字典
 * 项目分组数据与 ConfigurePlatform 保持一致。
 */

/** 分组对象映射，key 为分组编码，value 为显示名称 */
export const GROUP_MAP: Record<string, string> = {
  "0": "大连客运",
  "1": "中远散运",
  "2": "中远能源",
  "3": "中远特运",
  "4": "中远集运",
  "5": "内部自测",
  "6": "能源石油",
  "7": "海洋石油",
  "8": "散运沿海事业部",
  "9": "安监部",
  "10": "海南港航",
  "11": "大连能源供应链"
};

/** 分组下拉选项（含"全部"，用于筛选场景） */
export const GROUP_OPTIONS = [
  { value: "-1", label: "全部" },
  ...Object.entries(GROUP_MAP).map(([value, label]) => ({ value, label }))
];

/** 分组下拉选项（不含"全部"，用于表单新增/编辑场景） */
export const GROUP_FORM_OPTIONS = Object.entries(GROUP_MAP).map(
  ([value, label]) => ({ value, label })
);

/** 根据分组编码取显示名称（编码或已是中文名称均可） */
export function getGroupName(type: string | number | null | undefined): string {
  if (type == null || type === "") return "未知";
  const key = String(type).trim();
  if (GROUP_MAP[key]) return GROUP_MAP[key];
  if (Object.values(GROUP_MAP).includes(key)) return key;
  return "未知";
}
