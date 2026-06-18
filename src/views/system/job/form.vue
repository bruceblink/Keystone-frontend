<script setup lang="ts">
import { computed, ref } from "vue";
import type { JobInvokeTargetDTO, JobRequest } from "@/api/system/job";
import { formRules } from "./utils/rule";
import { useSystemDict } from "@/views/system/utils/dict";

interface FormProps {
  formInline: JobRequest;
  invokeTargetOptions: JobInvokeTargetDTO[];
}

const props = withDefaults(defineProps<FormProps>(), {
  formInline: () => ({
    jobName: "",
    jobGroup: "DEFAULT",
    invokeTarget: "",
    jobParams: "",
    cronExpression: "",
    concurrent: 0,
    status: 0,
    remark: ""
  }),
  invokeTargetOptions: () => []
});

const formData = ref(props.formInline);
const formRuleRef = ref();
const yesOrNoOptions = useSystemDict("common.yesOrNo").options;
const statusOptions = useSystemDict("sysJob.status").options;
const invokeTargetGroups = computed(() => {
  const groupMap = new Map<string, JobInvokeTargetDTO[]>();
  props.invokeTargetOptions.forEach(item => {
    const group = item.group || "default";
    const targets = groupMap.get(group) ?? [];
    targets.push(item);
    groupMap.set(group, targets);
  });
  return Array.from(groupMap.entries()).map(([group, targets]) => ({
    group,
    targets
  }));
});

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
      <el-select
        v-model="formData.invokeTarget"
        filterable
        allow-create
        default-first-option
        clearable
        placeholder="请选择或输入调用目标"
        class="!w-full"
      >
        <el-option-group
          v-for="group in invokeTargetGroups"
          :key="group.group"
          :label="group.group"
        >
          <el-option
            v-for="target in group.targets"
            :key="target.invokeTarget"
            :label="`${target.name} - ${target.invokeTarget}`"
            :value="target.invokeTarget"
          >
            <div class="job-target-option">
              <span class="job-target-name">{{ target.name }}</span>
              <span class="job-target-value">{{ target.invokeTarget }}</span>
            </div>
            <div v-if="target.description" class="job-target-desc">
              {{ target.description }}
            </div>
          </el-option>
        </el-option-group>
      </el-select>
    </el-form-item>
    <el-form-item label="任务参数" prop="jobParams">
      <el-input
        v-model="formData.jobParams"
        type="textarea"
        :rows="4"
        placeholder='请输入JSON参数，例如 {"retentionDays":60}'
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

<style scoped>
.job-target-option {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  line-height: 20px;
}

.job-target-name {
  overflow: hidden;
  color: var(--el-text-color-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.job-target-value {
  flex: none;
  font-family: var(--el-font-family);
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.job-target-desc {
  overflow: hidden;
  font-size: 12px;
  line-height: 18px;
  color: var(--el-text-color-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
