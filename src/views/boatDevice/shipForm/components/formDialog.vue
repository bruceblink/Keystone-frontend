<script setup lang="ts">
import { reactive, ref, watch, computed } from "vue";
import { ElMessage, type FormInstance, type FormRules } from "element-plus";
import VDialog from "@/components/VDialog/VDialog.vue";
import type { DeviceRecord } from "../utils/types";
import { GROUP_OPTIONS, NAV_STATUS_OPTIONS } from "../utils/dict";

defineOptions({ name: "BoatDeviceFormDialog" });

interface Props {
  modelValue: boolean;
  type: "add" | "edit";
  row?: DeviceRecord | null;
  existList: DeviceRecord[];
  onSubmit: (data: DeviceRecord) => Promise<void>;
}

const props = defineProps<Props>();
const emits = defineEmits<{
  (e: "update:modelValue", v: boolean): void;
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emits("update:modelValue", v)
});

const emptyForm = (): DeviceRecord => ({
  devid: "",
  shipname_cn: "",
  shipname_en: "",
  type: "",
  mmsi: "",
  lng: "",
  lat: "",
  speed: "",
  version: "",
  navstatus: "0",
  online: "0",
  remarks: "",
  create_time: ""
});

const formData = reactive<DeviceRecord>(emptyForm());
const formRef = ref<FormInstance>();
const loading = ref(false);

const validateDevId = (_rule: any, value: string, callback: any) => {
  if (!value) return callback(new Error("请输入设备编号"));
  if (!/^[a-zA-Z0-9_]+$/.test(value))
    return callback(new Error("设备编号只能包含字母、数字和下划线"));
  if (props.type === "edit" && props.row?.devid === value) return callback();
  if (props.existList.some(d => d.devid === value))
    return callback(new Error(`设备编号 ${value} 已存在`));
  callback();
};

const validateShipNameCN = (_rule: any, value: string, callback: any) => {
  if (!value) return callback();
  if (!/^[\u4e00-\u9fa50-9]+$/.test(value))
    return callback(new Error("只能包含中文和数字"));
  callback();
};

const validateShipNameEN = (_rule: any, value: string, callback: any) => {
  if (!value) return callback();
  if (!/^[a-zA-Z0-9\s]+$/.test(value))
    return callback(new Error("只能包含字母、数字和空格"));
  callback();
};

const validateMMSI = (_rule: any, value: string, callback: any) => {
  if (!value) return callback();
  if (!/^[0-9]{9}$/.test(value)) return callback(new Error("MMSI须为9位数字"));
  callback();
};

const validateCoordinate = (rule: any, value: string, callback: any) => {
  if (!value) return callback();
  const num = parseFloat(value);
  if (isNaN(num)) return callback(new Error("请输入有效数字"));
  if (rule.field === "lng" && (num < -180 || num > 180))
    return callback(new Error("经度范围 -180 ~ 180"));
  if (rule.field === "lat" && (num < -90 || num > 90))
    return callback(new Error("纬度范围 -90 ~ 90"));
  callback();
};

const rules: FormRules = {
  devid: [{ required: true, validator: validateDevId, trigger: "blur" }],
  shipname_cn: [
    { required: true, message: "请输入船名（中文）", trigger: "blur" },
    { validator: validateShipNameCN, trigger: "blur" }
  ],
  shipname_en: [
    { required: true, message: "请输入船名（英文）", trigger: "blur" },
    { validator: validateShipNameEN, trigger: "blur" }
  ],
  type: [{ required: true, message: "请选择所属分组", trigger: "change" }],
  mmsi: [
    { required: true, message: "请输入MMSI", trigger: "blur" },
    { validator: validateMMSI, trigger: "blur" }
  ],
  lng: [{ validator: validateCoordinate, trigger: "blur" }],
  lat: [{ validator: validateCoordinate, trigger: "blur" }]
};

function handleOpened() {
  if (props.row) {
    Object.assign(formData, props.row);
  } else {
    Object.assign(formData, emptyForm());
    formRef.value?.resetFields();
  }
}

async function handleConfirm() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) {
    ElMessage.error("请完善表单信息");
    return;
  }
  loading.value = true;
  try {
    await props.onSubmit({ ...formData });
  } finally {
    loading.value = false;
  }
}

watch(visible, v => {
  if (!v) formRef.value?.clearValidate();
});
</script>

<template>
  <v-dialog
    show-full-screen
    :fixed-body-height="false"
    use-body-scrolling
    :title="type === 'add' ? '添加船舶设备' : '编辑船舶设备'"
    v-model="visible"
    :loading="loading"
    @confirm="handleConfirm"
    @cancel="visible = false"
    @opened="handleOpened"
  >
    <el-form ref="formRef" :model="formData" :rules="rules" label-width="130px">
      <el-form-item label="设备编号" prop="devid">
        <el-input
          v-model="formData.devid"
          placeholder="字母、数字、下划线"
          maxlength="32"
          show-word-limit
          :disabled="type === 'edit'"
        />
      </el-form-item>
      <el-form-item label="船名（中文）" prop="shipname_cn">
        <el-input
          v-model="formData.shipname_cn"
          placeholder="请输入船名（中文）"
          maxlength="32"
          show-word-limit
        />
      </el-form-item>
      <el-form-item label="船名（英文）" prop="shipname_en">
        <el-input
          v-model="formData.shipname_en"
          placeholder="请输入船名（英文）"
          maxlength="32"
          show-word-limit
        />
      </el-form-item>
      <el-form-item label="所属分组" prop="type">
        <el-select
          v-model="formData.type"
          placeholder="请选择所属分组"
          style="width: 100%"
        >
          <el-option
            v-for="opt in GROUP_OPTIONS"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="MMSI" prop="mmsi">
        <el-input
          v-model="formData.mmsi"
          placeholder="9位数字"
          maxlength="9"
          show-word-limit
        />
      </el-form-item>
      <el-form-item label="经度" prop="lng">
        <el-input v-model="formData.lng" placeholder="-180 ~ 180" />
      </el-form-item>
      <el-form-item label="纬度" prop="lat">
        <el-input v-model="formData.lat" placeholder="-90 ~ 90" />
      </el-form-item>
      <el-form-item label="航速（kn）" prop="speed">
        <el-input v-model="formData.speed" placeholder="请输入航速" />
      </el-form-item>
      <el-form-item label="版本号" prop="version">
        <el-input
          v-model="formData.version"
          placeholder="请输入版本号"
          maxlength="32"
          show-word-limit
        />
      </el-form-item>
      <el-form-item label="航行状态" prop="navstatus">
        <el-select
          v-model="formData.navstatus"
          placeholder="请选择航行状态"
          style="width: 100%"
        >
          <el-option
            v-for="opt in NAV_STATUS_OPTIONS"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="备注" prop="remarks" style="margin-bottom: 0">
        <el-input
          v-model="formData.remarks"
          type="textarea"
          :rows="3"
          placeholder="可添加备注"
        />
      </el-form-item>
    </el-form>
  </v-dialog>
</template>
