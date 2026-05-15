<script setup lang="ts">
import { ref } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import type { AlarmTypeForm } from "../utils/types";

defineProps<{
  mode: "add" | "edit";
  rules: FormRules;
}>();

const form = defineModel<AlarmTypeForm>("form", { required: true });
const visible = defineModel<boolean>("visible");
const emit = defineEmits<{ submit: [] }>();

const formRef = ref<FormInstance | null>(null);

function handleSubmit() {
  formRef.value?.validate(valid => {
    if (valid) emit("submit");
  });
}
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="mode === 'add' ? '新增报警类型' : '编辑报警类型'"
    width="480px"
    :close-on-click-modal="false"
    destroy-on-close
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
      <el-form-item label="报警编号" prop="id">
        <el-input
          v-model="form.id"
          placeholder="请输入报警编号"
          :disabled="mode === 'edit'"
        />
      </el-form-item>
      <el-form-item label="报警类型名称" prop="des">
        <el-input v-model="form.des" placeholder="请输入报警类型名称" />
      </el-form-item>
      <el-form-item label="类型" prop="type">
        <el-select v-model="form.type" placeholder="请选择类型" class="w-full">
          <el-option label="记录" value="0" />
          <el-option label="报警" value="1" />
        </el-select>
      </el-form-item>
      <el-form-item label="分组编号" prop="alarmid">
        <el-input
          v-model="form.alarmid"
          placeholder="请输入分组编号"
          maxlength="4"
          show-word-limit
        />
      </el-form-item>
      <el-form-item label="云端同步">
        <el-switch v-model="form.s2cloud" active-value="1" inactive-value="0" />
      </el-form-item>
      <el-form-item label="船端同步">
        <el-switch v-model="form.s2ship" active-value="1" inactive-value="0" />
      </el-form-item>
      <el-form-item label="可见状态">
        <el-switch
          v-model="form.visibility"
          active-value="1"
          inactive-value="0"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>
