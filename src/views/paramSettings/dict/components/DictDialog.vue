<script setup lang="ts">
import { ref } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import type { DictForm } from "../utils/types";

defineProps<{
  mode: "add" | "edit";
  formRules: FormRules;
  moduleOptions: Array<{ label: string; value: string }>;
  showModuleField: boolean;
  isConfigMode: boolean;
  onKeyValueInput: (v: string, form: DictForm) => void;
}>();

const form = defineModel<DictForm>("form", { required: true });
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
    :title="`${mode === 'add' ? '新增' : '编辑'}${
      isConfigMode ? '设备配置' : '字典值'
    }`"
    width="480px"
    :close-on-click-modal="false"
    destroy-on-close
  >
    <el-form ref="formRef" :model="form" :rules="formRules" label-width="82px">
      <el-form-item
        :label="isConfigMode ? '配置项' : '值标识'"
        :prop="mode === 'add' ? 'keyname' : undefined"
      >
        <el-input
          v-model="form.keyname"
          :placeholder="isConfigMode ? '请输入配置项' : '请输入值标识'"
          :disabled="mode === 'edit'"
        />
      </el-form-item>
      <el-form-item
        :label="isConfigMode ? '配置值' : '显示名称'"
        prop="keyvalue"
      >
        <el-input
          v-model="form.keyvalue"
          :placeholder="isConfigMode ? '请输入配置值' : '请输入显示名称'"
          @input="(v: string) => onKeyValueInput(v, form)"
        />
      </el-form-item>
      <el-form-item v-if="showModuleField" label="模块">
        <el-select
          v-model="form.groupKey"
          placeholder="请选择模块"
          clearable
          filterable
          allow-create
          default-first-option
          class="w-full"
        >
          <el-option
            v-for="item in moduleOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="类型">
        <el-input v-model="form.type" disabled />
      </el-form-item>
      <el-form-item label="用户">
        <el-input v-model="form.user" disabled />
      </el-form-item>
      <el-form-item label="描述" prop="descripton">
        <el-input
          v-model="form.descripton"
          placeholder="请输入描述"
          type="textarea"
          :rows="2"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>
