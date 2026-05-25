<script setup lang="ts">
import { ref, watch } from "vue";
import { ElMessage, type FormInstance, type FormRules } from "element-plus";
import type { CameraForm, ComboxOption } from "../utils/types";

defineProps<{
  mode: "add" | "edit";
  formRules: FormRules;
  areaIdOptions: ComboxOption[];
  areaCodeOptions: ComboxOption[];
  brandOptions: ComboxOption[];
  onImportTemplate?: () => void;
}>();

const form = defineModel<CameraForm>("form", { required: true });
const visible = defineModel<boolean>("visible");
const emit = defineEmits<{ submit: [form: CameraForm] }>();

const formRef = ref<FormInstance | null>(null);

watch(visible, val => {
  if (!val) formRef.value?.clearValidate();
});

function handleUrlInput(value: string) {
  if (/[\u4e00-\u9fa5]/.test(value)) {
    form.value.url = value.replace(/[\u4e00-\u9fa5]/g, "");
    ElMessage.warning("访问地址不能输入中文");
  }
}

function handleSubmit() {
  formRef.value?.validate(valid => {
    if (valid) emit("submit", { ...form.value });
  });
}
</script>

<template>
  <el-drawer
    v-model="visible"
    :title="mode === 'add' ? '添加摄像机' : '编辑摄像机'"
    direction="rtl"
    size="520px"
    destroy-on-close
  >
    <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px">
      <el-form-item label="摄像机编号" prop="camid">
        <el-input
          v-model="form.camid"
          placeholder="请输入摄像机编号"
          maxlength="64"
          show-word-limit
          :disabled="mode === 'edit'"
        />
      </el-form-item>
      <el-form-item label="设备名称" prop="devname">
        <el-input
          v-model="form.devname"
          placeholder="请输入设备名称"
          maxlength="64"
          show-word-limit
        />
      </el-form-item>
      <el-form-item label="区域编号" prop="areaid">
        <el-select
          v-model="form.areaid"
          placeholder="请选择区域编号"
          class="w-full"
        >
          <el-option
            v-for="item in areaIdOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="区域类型" prop="areacode">
        <el-select
          v-model="form.areacode"
          placeholder="请选择区域类型"
          class="w-full"
        >
          <el-option
            v-for="item in areaCodeOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="IP地址" prop="ipaddr">
        <el-input v-model="form.ipaddr" placeholder="请输入IP地址" />
      </el-form-item>
      <el-form-item label="用户名" prop="user">
        <el-input v-model="form.user" placeholder="请输入用户名" />
      </el-form-item>
      <el-form-item label="密码" prop="passwd">
        <el-input
          v-model="form.passwd"
          type="password"
          placeholder="请输入密码"
          show-password
        />
      </el-form-item>
      <el-form-item label="访问地址" prop="url">
        <el-input
          v-model="form.url"
          placeholder="请输入访问地址"
          @input="handleUrlInput"
        />
      </el-form-item>
      <el-form-item label="设备品牌" prop="brand">
        <el-select
          v-model="form.brand"
          placeholder="请选择设备品牌"
          class="w-full"
        >
          <el-option
            v-for="item in brandOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="辅码流" prop="sub_stream">
        <el-input v-model="form.sub_stream" placeholder="请输入辅码流" />
      </el-form-item>
      <el-form-item label="是否推理" prop="inference">
        <el-radio-group v-model="form.inference">
          <el-radio label="0">不推理</el-radio>
          <el-radio label="1">推理</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="handleSubmit">提交</el-button>
        <el-button v-if="mode === 'add'" @click="onImportTemplate?.()">
          导入模板
        </el-button>
      </el-form-item>
    </el-form>
  </el-drawer>
</template>

<style scoped lang="scss">
.w-full {
  width: 100%;
}
</style>
