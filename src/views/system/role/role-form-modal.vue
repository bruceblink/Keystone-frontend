<script setup lang="ts">
import VDialog from "@/components/VDialog/VDialog.vue";
import { computed, reactive, ref } from "vue";
import { useUserStoreHook } from "@/store/modules/user";
import { ElMessage, FormInstance, FormRules } from "element-plus";
import type { DictionaryData } from "@/api/common/login";
import {
  AddRoleCommand,
  RoleDTO,
  UpdateRoleCommand,
  addRoleApi,
  updateRoleApi
} from "@/api/system/role";
import { MenuDTO } from "@/api/system/menu";

interface Props {
  type: "add" | "update";
  modelValue: boolean;
  row?: RoleDTO;
  menuOptions: MenuDTO[];
}

const props = defineProps<Props>();
const emits = defineEmits<{
  (e: "update:modelValue", v: boolean): void;
  (e: "success"): void;
}>();

const visible = computed({
  get: () => props.modelValue,
  set(v) {
    emits("update:modelValue", v);
  }
});

const DEFAULT_STATUS = 1;
const fallbackStatusList: DictionaryData[] = [
  { label: "已启用", value: 1, cssTag: "success" },
  { label: "已停用", value: 0, cssTag: "info" }
];

function createDefaultFormData(): UpdateRoleCommand {
  return {
    roleId: 0,
    dataScope: "",
    menuIds: [],
    remark: "",
    roleKey: "",
    roleName: "",
    roleSort: 1,
    status: DEFAULT_STATUS
  };
}

const formData = reactive<UpdateRoleCommand>({
  roleId: 0,
  dataScope: "",
  menuIds: [],
  remark: "",
  roleKey: "",
  roleName: "",
  roleSort: 1,
  status: DEFAULT_STATUS
});

const statusList = computed<DictionaryData[]>(() => {
  const userStore = useUserStoreHook();
  const list = userStore.dictionaryList["common.status"];
  if (Array.isArray(list) && list.length) {
    return list;
  }

  const map = userStore.dictionaryMap["common.status"];
  if (map && Object.keys(map).length) {
    return Object.values(map);
  }

  return fallbackStatusList;
});

const rules: FormRules = {
  roleName: [
    {
      required: true,
      message: "角色名称不能为空"
    }
  ],
  roleKey: [
    {
      required: true,
      message: "权限标识不能为空"
    }
  ],
  roleSort: [
    {
      required: true,
      message: "角色序号不能为空"
    }
  ],
  status: [
    {
      required: true,
      message: "角色状态不能为空",
      trigger: "change"
    }
  ]
};
const formRef = ref<FormInstance>();
function handleOpened() {
  if (props.row) {
    Object.assign(formData, createDefaultFormData(), props.row, {
      menuIds: props.row.selectedMenuList ?? [],
      status: normalizeStatus(props.row.status)
    });
  } else {
    Object.assign(formData, createDefaultFormData());
  }
  formRef.value?.clearValidate();
  treeRef.value?.setCheckedKeys(formData.menuIds, false);
}

const treeRef = ref<any>();
function handleCheckChange() {
  formData.menuIds = treeRef.value.getCheckedKeys(false) as number[];
}

function normalizeStatus(status: unknown) {
  if (status === "" || status === undefined || status === null) {
    return DEFAULT_STATUS;
  }

  const statusValue = Number(status);
  return Number.isNaN(statusValue) ? DEFAULT_STATUS : statusValue;
}

function buildRolePayload(): AddRoleCommand {
  return {
    dataScope: formData.dataScope,
    menuIds: formData.menuIds,
    remark: formData.remark,
    roleKey: formData.roleKey,
    roleName: formData.roleName,
    roleSort: formData.roleSort,
    status: normalizeStatus(formData.status)
  };
}

function isHttpHandledError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    ("msg" in error || "isAxiosError" in error)
  );
}

const loading = ref(false);
async function handleConfirm() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (valid === false) {
    return;
  }

  try {
    loading.value = true;
    const payload = buildRolePayload();
    if (props.type === "add") {
      await addRoleApi(payload);
    } else if (props.type === "update") {
      await updateRoleApi({
        ...payload,
        roleId: formData.roleId
      });
    }
    ElMessage.info("提交成功");
    visible.value = false;
    emits("success");
  } catch (e) {
    if (!isHttpHandledError(e)) {
      ElMessage.error("提交失败，请稍后重试");
    }
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <v-dialog
    show-full-screen
    fixed-body-height
    use-body-scrolling
    :title="type === 'add' ? '新增角色' : '更新角色'"
    v-model="visible"
    :loading="loading"
    @confirm="handleConfirm"
    @cancel="visible = false"
    @opened="handleOpened"
  >
    <el-form :model="formData" label-width="120px" :rules="rules" ref="formRef">
      <el-form-item prop="roleName" label="角色名称" required inline-message>
        <el-input v-model="formData.roleName" />
      </el-form-item>
      <el-form-item prop="roleKey" label="权限字符" required>
        <el-input v-model="formData.roleKey" />
      </el-form-item>
      <el-form-item prop="roleSort" label="角色顺序" required>
        <el-input-number :min="1" v-model="formData.roleSort" />
      </el-form-item>
      <el-form-item prop="status" label="角色状态">
        <el-radio-group v-model="formData.status">
          <el-radio
            v-for="item in statusList"
            :key="item.value"
            :value="item.value"
          >
            {{ item.label }}
          </el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="菜单权限" prop="menuIds">
        <el-tree
          ref="treeRef"
          :props="{ label: 'menuName', children: 'children' }"
          :data="props.menuOptions"
          node-key="id"
          check-strictly
          show-checkbox
          default-expand-all
          check-on-click-node
          :expand-on-click-node="false"
          :default-checked-keys="formData.menuIds"
          @check-change="handleCheckChange"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item prop="remark" label="备注" style="margin-bottom: 0">
        <el-input type="textarea" v-model="formData.remark" />
      </el-form-item>
    </el-form>
  </v-dialog>
</template>
