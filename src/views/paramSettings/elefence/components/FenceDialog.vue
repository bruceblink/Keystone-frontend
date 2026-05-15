<script setup lang="ts">
import { ref } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import type { FenceForm } from "../utils/types";

interface AreaOption {
  label: string;
  value: string;
}

defineProps<{
  mode: "add" | "edit";
  rules: FormRules;
  areaOptions: AreaOption[];
  onAddPoint: () => void;
  onRemovePoint: (idx: number) => void;
}>();

const form = defineModel<FenceForm>("form", { required: true });
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
    :title="mode === 'add' ? '新增电子围栏' : '编辑电子围栏'"
    width="520px"
    :close-on-click-modal="false"
    destroy-on-close
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
      <el-form-item label="数据类型" prop="datatype">
        <el-select
          v-model="form.datatype"
          placeholder="请选择数据类型"
          class="w-full"
        >
          <el-option label="区域" value="0" />
          <el-option label="点" value="1" />
          <el-option label="线" value="2" />
        </el-select>
      </el-form-item>
      <el-form-item label="水域类型" prop="areatype">
        <el-select
          v-model="form.areatype"
          placeholder="请选择水域类型"
          class="w-full"
        >
          <el-option
            v-for="opt in areaOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="区域名称" prop="name">
        <el-input v-model="form.name" placeholder="请输入区域名称" />
      </el-form-item>
      <el-form-item label="位置数据" prop="data">
        <div class="points-wrapper">
          <div v-for="(point, idx) in form.data" :key="idx" class="point-row">
            <span class="point-label">经度</span>
            <el-input v-model.number="point.lng" class="coord-input" />
            <span class="point-label">纬度</span>
            <el-input v-model.number="point.lat" class="coord-input" />
            <el-button
              v-if="form.data.length > 1"
              type="danger"
              size="small"
              link
              @click="onRemovePoint(idx)"
            >
              删除
            </el-button>
          </div>
          <el-button type="primary" size="small" @click="onAddPoint">
            添加坐标点
          </el-button>
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.points-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.point-row {
  display: flex;
  gap: 6px;
  align-items: center;
}

.point-label {
  font-size: 13px;
  color: var(--el-text-color-regular);
  white-space: nowrap;
}

.coord-input {
  width: 110px;
}
</style>
