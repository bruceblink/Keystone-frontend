import { reactive } from "vue";
import type { FormRules } from "element-plus";

export const formRules = reactive(<FormRules>{
  isButton: [
    {
      validator: (rule, value, callback) => {
        if (value === undefined || value === null) {
          callback(new Error("请选择类型"));
        } else {
          callback();
        }
      },
      trigger: "change"
    }
  ],
  menuName: [{ required: true, message: "菜单名称为必填项", trigger: "blur" }],
  menuType: [{ required: true, message: "请选择菜单类型", trigger: "change" }],
  path: [{ required: true, message: "路径为必填项", trigger: "blur" }],
  routerName: [
    { required: true, message: "组件名/网站地址为必填项", trigger: "blur" }
  ],
  "meta.frameSrc": [
    { required: true, message: "网站地址为必填项", trigger: "blur" }
  ]
});
