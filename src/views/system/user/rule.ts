import { reactive } from "vue";
import type { FormRules } from "element-plus";
import { isEmail, isPhone } from "@pureadmin/utils";

/** 自定义表单规则校验 */
export const formRules = reactive(<FormRules>{
  username: [{ required: true, message: "用户名为必填项", trigger: "blur" }],
  phoneNumber: [
    {
      validator: (rule, value, callback) => {
        if (value && !isPhone(value)) {
          callback(new Error("请输入正确的手机号码格式"));
        } else {
          callback();
        }
      },
      trigger: "blur"
    }
  ],
  email: [
    { required: true, message: "邮箱为必填项", trigger: "blur" },
    {
      validator: (rule, value, callback) => {
        if (!isEmail(value)) {
          callback(new Error("请输入正确的邮箱格式"));
        } else {
          callback();
        }
      },
      trigger: "blur"
    }
  ],
  roleId: [{ required: true, message: "角色为必填项", trigger: "change" }],
  password: [
    { required: true, message: "密码为必填项", trigger: "blur" },
    { min: 6, message: "密码长度不能少于6位", trigger: "blur" }
  ]
});
