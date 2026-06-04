<script setup lang="ts">
import { ref } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import type { DictTypeForm } from "../utils/types";

defineProps<{
  mode: "add" | "edit";
  formRules: FormRules;
  categoryOptions: Array<{ label: string; value: string }>;
  scopeOptions: Array<{ label: string; value: string }>;
}>();

const form = defineModel<DictTypeForm>("form", { required: true });
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
    :title="mode === 'add' ? '新增字典类型' : '编辑字典类型'"
    width="560px"
    :close-on-click-modal="false"
    destroy-on-close
  >
    <el-form ref="formRef" :model="form" :rules="formRules" label-width="86px">
      <el-form-item label="类型标识" prop="dictType">
        <el-input
          v-model="form.dictType"
          placeholder="例如 device.configModule"
          :disabled="mode === 'edit'"
        />
      </el-form-item>
      <el-form-item label="类型名称" prop="dictName">
        <el-input v-model="form.dictName" placeholder="请输入类型名称" />
      </el-form-item>
      <el-form-item label="分类" prop="category">
        <el-select
          v-model="form.category"
          placeholder="请选择分类"
          filterable
          class="w-full"
        >
          <el-option
            v-for="item in categoryOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="作用域" prop="scope">
        <el-select
          v-model="form.scope"
          placeholder="请选择作用域"
          class="w-full"
        >
          <el-option
            v-for="item in scopeOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-switch
          v-model="form.status"
          :active-value="1"
          :inactive-value="0"
          active-text="启用"
          inactive-text="停用"
        />
      </el-form-item>
      <el-form-item label="排序" prop="sort">
        <el-input-number v-model="form.sort" :min="0" class="!w-full" />
      </el-form-item>
      <el-form-item label="兼容别名">
        <el-select
          v-model="form.aliases"
          multiple
          filterable
          allow-create
          default-first-option
          placeholder="输入后回车添加，例如 所属水域"
          class="w-full"
        />
      </el-form-item>
      <el-form-item label="备注">
        <el-input
          v-model="form.remark"
          placeholder="请输入备注"
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
