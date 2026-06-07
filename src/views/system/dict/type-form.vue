<script setup lang="ts">
import { computed, ref } from "vue";
import { useUserStoreHook } from "@/store/modules/user";
import type { DictionaryData } from "@/api/common/login";
import type { DictTypeRequest } from "@/api/system/dict";
import { dictTypeRules } from "./utils/rule";

type DictionaryList =
  | Map<string, DictionaryData[]>
  | Record<string, DictionaryData[]>;

interface FormProps {
  formInline: DictTypeRequest;
}

const props = withDefaults(defineProps<FormProps>(), {
  formInline: () => ({
    dictName: "",
    dictType: "",
    status: 1,
    remark: ""
  })
});

const formData = ref(props.formInline);
const formRuleRef = ref();
const userStore = useUserStoreHook();
const statusList = computed(() => getDictionaryList("common.status"));

function getDictionaryList(dictType: string) {
  const dictionaryList = userStore.dictionaryList as DictionaryList;
  return dictionaryList instanceof Map
    ? dictionaryList.get(dictType) ?? []
    : dictionaryList[dictType] ?? [];
}

function getFormRuleRef() {
  return formRuleRef.value;
}

defineExpose({ getFormRuleRef });
</script>

<template>
  <el-form
    ref="formRuleRef"
    :model="formData"
    :rules="dictTypeRules"
    label-width="92px"
  >
    <el-form-item label="字典名称" prop="dictName">
      <el-input
        v-model="formData.dictName"
        clearable
        placeholder="请输入字典名称"
      />
    </el-form-item>
    <el-form-item label="字典类型" prop="dictType">
      <el-input
        v-model="formData.dictType"
        clearable
        placeholder="请输入字典类型"
      />
    </el-form-item>
    <el-form-item label="状态" prop="status">
      <el-radio-group v-model="formData.status">
        <el-radio
          v-for="dict in statusList"
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
