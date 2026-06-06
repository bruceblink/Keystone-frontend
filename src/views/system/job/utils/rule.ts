import { reactive } from "vue";
import type { FormRules } from "element-plus";

export const formRules = reactive(<FormRules>{
  jobName: [{ required: true, message: "任务名称不能为空", trigger: "blur" }],
  jobGroup: [{ required: true, message: "任务组名不能为空", trigger: "blur" }],
  invokeTarget: [
    { required: true, message: "调用目标不能为空", trigger: "blur" }
  ],
  cronExpression: [
    { required: true, message: "Cron表达式不能为空", trigger: "blur" }
  ],
  concurrent: [
    { required: true, message: "允许并发不能为空", trigger: "change" }
  ],
  status: [{ required: true, message: "状态不能为空", trigger: "change" }]
});
