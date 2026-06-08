import { reactive } from "vue";
import type { FormRules } from "element-plus";

export const dictTypeRules = reactive(<FormRules>{
  dictName: [{ required: true, message: "字典名称不能为空", trigger: "blur" }],
  dictType: [{ required: true, message: "字典类型不能为空", trigger: "blur" }],
  status: [{ required: true, message: "状态不能为空", trigger: "change" }]
});

export const dictDataRules = reactive(<FormRules>{
  dictType: [{ required: true, message: "字典类型不能为空", trigger: "blur" }],
  dictLabel: [{ required: true, message: "数据标签不能为空", trigger: "blur" }],
  dictValue: [{ required: true, message: "数据键值不能为空", trigger: "blur" }],
  status: [{ required: true, message: "状态不能为空", trigger: "change" }]
});
