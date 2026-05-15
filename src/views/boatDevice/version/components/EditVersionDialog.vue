<script setup lang="ts">
import { ref } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import type { VersionForm } from "../utils/types";

defineProps<{ rules: FormRules }>();

const form = defineModel<VersionForm>("form", { required: true });
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
    title="编辑版本信息"
    width="480px"
    :close-on-click-modal="false"
    destroy-on-close
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-form-item label="软件名称" prop="ver_name">
        <el-input
          v-model="form.ver_name"
          placeholder="请输入软件名称"
          clearable
        />
      </el-form-item>
      <el-form-item label="版本号" prop="version">
        <el-input v-model="form.version" placeholder="请输入版本号" clearable />
      </el-form-item>
      <el-form-item label="存储路径" prop="client_path">
        <el-input
          v-model="form.client_path"
          placeholder="请输入存储路径"
          clearable
        />
      </el-form-item>
      <el-form-item label="发布说明" prop="ver_des">
        <el-input
          v-model="form.ver_des"
          type="textarea"
          :rows="4"
          placeholder="请输入版本更新说明"
          maxlength="500"
          show-word-limit
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="handleSubmit">确认修改</el-button>
    </template>
  </el-dialog>
</template>
