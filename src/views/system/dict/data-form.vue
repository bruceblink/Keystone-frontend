<script setup lang="ts">
import { ref } from "vue";
import type { DictDataRequest } from "@/api/system/dict";
import { dictDataRules } from "./utils/rule";
import { useSystemDict } from "@/views/system/utils/dict";

interface FormProps {
  formInline: DictDataRequest;
  dictTypeDisabled?: boolean;
}

const props = withDefaults(defineProps<FormProps>(), {
  formInline: () => ({
    dictType: "",
    dictLabel: "",
    dictValue: "",
    dictSort: 1,
    isDefault: 0,
    cssClass: "",
    listClass: "",
    status: 1,
    remark: ""
  }),
  dictTypeDisabled: false
});

const formData = ref(props.formInline);
const formRuleRef = ref();
const statusOptions = useSystemDict("common.status").options;
const yesOrNoOptions = useSystemDict("common.yesOrNo").options;

function getFormRuleRef() {
  return formRuleRef.value;
}

defineExpose({ getFormRuleRef });
</script>

<template>
  <el-form
    ref="formRuleRef"
    :model="formData"
    :rules="dictDataRules"
    label-width="92px"
  >
    <el-form-item label="字典类型" prop="dictType">
      <el-input
        v-model="formData.dictType"
        :clearable="!dictTypeDisabled"
        :disabled="dictTypeDisabled"
        placeholder="请输入字典类型"
      />
    </el-form-item>
    <el-form-item label="数据标签" prop="dictLabel">
      <el-input
        v-model="formData.dictLabel"
        clearable
        placeholder="请输入数据标签"
      />
    </el-form-item>
    <el-form-item label="数据键值" prop="dictValue">
      <el-input
        v-model="formData.dictValue"
        clearable
        placeholder="请输入数据键值"
      />
    </el-form-item>
    <el-form-item label="排序" prop="dictSort">
      <el-input-number v-model="formData.dictSort" :min="0" />
    </el-form-item>
    <el-form-item label="默认值" prop="isDefault">
      <el-radio-group v-model="formData.isDefault">
        <el-radio
          v-for="dict in yesOrNoOptions"
          :key="dict.value"
          :label="dict.value"
        >
          {{ dict.label }}
        </el-radio>
      </el-radio-group>
    </el-form-item>
    <el-form-item label="标签样式" prop="listClass">
      <el-input
        v-model="formData.listClass"
        clearable
        placeholder="如 primary、success、warning、danger"
      />
    </el-form-item>
    <el-form-item label="CSS类名" prop="cssClass">
      <el-input
        v-model="formData.cssClass"
        clearable
        placeholder="请输入CSS类名"
      />
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
