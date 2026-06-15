<script setup lang="ts">
import { ref } from "vue";
import type { JobRequest } from "@/api/system/job";
import { formRules } from "./utils/rule";
import { useSystemDict } from "@/views/system/utils/dict";

interface FormProps {
  formInline: JobRequest;
}

const props = withDefaults(defineProps<FormProps>(), {
  formInline: () => ({
    jobName: "",
    jobGroup: "DEFAULT",
    invokeTarget: "",
    cronExpression: "",
    concurrent: 0,
    status: 0,
    remark: ""
  })
});

const formData = ref(props.formInline);
const formRuleRef = ref();
const yesOrNoOptions = useSystemDict("common.yesOrNo").options;
const statusOptions = useSystemDict("sysJob.status").options;

function getFormRuleRef() {
  return formRuleRef.value;
}

defineExpose({ getFormRuleRef });
</script>

<template>
  <el-form
    ref="formRuleRef"
    :model="formData"
    :rules="formRules"
    label-width="112px"
  >
    <el-form-item label="任务名称" prop="jobName">
      <el-input
        v-model="formData.jobName"
        clearable
        placeholder="请输入任务名称"
      />
    </el-form-item>
    <el-form-item label="任务组名" prop="jobGroup">
      <el-input
        v-model="formData.jobGroup"
        clearable
        placeholder="请输入任务组名"
      />
    </el-form-item>
    <el-form-item label="调用目标" prop="invokeTarget">
      <el-input
        v-model="formData.invokeTarget"
        clearable
        placeholder="例如 demoTask.cleanExpiredData()"
      />
    </el-form-item>
    <el-form-item label="Cron表达式" prop="cronExpression">
      <el-input
        v-model="formData.cronExpression"
        clearable
        placeholder="例如 0 0/5 * * * *"
      />
    </el-form-item>
    <el-form-item label="允许并发" prop="concurrent">
      <el-radio-group v-model="formData.concurrent">
        <el-radio
          v-for="dict in yesOrNoOptions"
          :key="dict.value"
          :label="dict.value"
        >
          {{ dict.label }}
        </el-radio>
      </el-radio-group>
    </el-form-item>
    <el-form-item label="状态" prop="status">
      <el-radio-group v-model="formData.status">
        <el-radio
          v-for="dict in statusOptions"
          :key="dict.value"
          :label="dict.value"
        >
          {{ dict.label }}
        </el-radio>
      </el-radio-group>
    </el-form-item>
    <el-form-item label="备注" prop="remark">
      <el-input
        v-model="formData.remark"
        type="textarea"
        placeholder="请输入备注"
      />
    </el-form-item>
  </el-form>
</template>
