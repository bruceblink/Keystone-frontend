<script setup lang="ts">
import dayjs from "dayjs";
import { onMounted, reactive, ref, toRaw } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { message } from "@/utils/message";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import type { PaginationProps } from "@pureadmin/table";
import {
  addServiceClientApi,
  getServiceClientDetailApi,
  getServiceClientListApi,
  updateServiceClientApi
} from "@/api/system/serviceClient";
import type {
  ServiceClientDTO,
  ServiceClientQuery,
  ServiceClientRequest,
  UpdateServiceClientRequest
} from "@/api/system/serviceClient";

import Search from "@iconify-icons/ep/search";
import Refresh from "@iconify-icons/ep/refresh";
import EditPen from "@iconify-icons/ep/edit-pen";
import AddFill from "@iconify-icons/ri/add-circle-line";

defineOptions({
  name: "SystemServiceClient"
});

type DialogMode = "add" | "edit" | "detail";

type ServiceClientForm = UpdateServiceClientRequest & {
  serviceId: string;
  serviceSecret?: string;
};

const searchFormRef = ref<FormInstance>();
const clientFormRef = ref<FormInstance>();
const pageLoading = ref(false);
const submitLoading = ref(false);
const dialogVisible = ref(false);
const dialogMode = ref<DialogMode>("add");
const dialogTitle = ref("新增服务客户端");
const dataList = ref<ServiceClientDTO[]>([]);

const searchFormParams = reactive<ServiceClientQuery>({
  serviceId: undefined,
  name: undefined,
  active: undefined,
  integrationType: undefined
});

const pagination = reactive<PaginationProps>({
  total: 0,
  pageSize: 10,
  currentPage: 1,
  background: true
});

const integrationTypeOptions = [
  { label: "internal", value: "internal" },
  { label: "third_party", value: "third_party" },
  { label: "gateway", value: "gateway" },
  { label: "job", value: "job" }
];

const initialForm = (): ServiceClientForm => ({
  serviceId: "",
  serviceSecret: "",
  name: "",
  description: "",
  allowedScopes: ["read"],
  allowedAudiences: ["admin-backend"],
  active: true,
  integrationType: "internal",
  introspectionAllowed: true,
  tokenTtlSeconds: 3600,
  owner: "",
  contact: ""
});

const clientForm = reactive<ServiceClientForm>(initialForm());

const listValidator =
  (fieldLabel: string, allowWildcard: boolean) =>
  (_rule: unknown, value: string[], callback: (error?: Error) => void) => {
    const normalized = normalizeList(value);
    if (!normalized.length) {
      callback(new Error(`${fieldLabel}不能为空`));
      return;
    }
    const invalidValue = normalized.find(item => /\s/.test(item));
    if (invalidValue) {
      callback(new Error(`${fieldLabel}不能包含空白字符`));
      return;
    }
    if (!allowWildcard && normalized.includes("*")) {
      callback(new Error(`${fieldLabel}不能使用*通配符`));
      return;
    }
    callback();
  };

const rules: FormRules<ServiceClientForm> = {
  serviceId: [
    { required: true, message: "请输入服务ID", trigger: "blur" },
    { max: 128, message: "长度不能超过128个字符", trigger: "blur" }
  ],
  serviceSecret: [
    { required: true, message: "请输入服务密钥", trigger: "blur" },
    { max: 256, message: "长度不能超过256个字符", trigger: "blur" }
  ],
  name: [
    { required: true, message: "请输入服务名称", trigger: "blur" },
    { max: 128, message: "长度不能超过128个字符", trigger: "blur" }
  ],
  allowedScopes: [
    {
      required: true,
      validator: listValidator("Scope", false),
      trigger: "change"
    }
  ],
  allowedAudiences: [
    {
      required: true,
      validator: listValidator("Audience", true),
      trigger: "change"
    }
  ],
  tokenTtlSeconds: [
    { type: "number", min: 1, message: "Token TTL必须大于0", trigger: "blur" }
  ]
};

const columns: TableColumnList = [
  {
    label: "服务ID",
    prop: "serviceId",
    minWidth: 180,
    fixed: "left"
  },
  {
    label: "服务名称",
    prop: "name",
    minWidth: 170
  },
  {
    label: "集成类型",
    prop: "integrationType",
    minWidth: 120
  },
  {
    label: "Scope",
    prop: "allowedScopes",
    minWidth: 180,
    slot: "allowedScopes"
  },
  {
    label: "Audience",
    prop: "allowedAudiences",
    minWidth: 180,
    slot: "allowedAudiences"
  },
  {
    label: "状态",
    prop: "active",
    minWidth: 90,
    slot: "active"
  },
  {
    label: "Token TTL",
    prop: "tokenTtlSeconds",
    minWidth: 110
  },
  {
    label: "负责人",
    prop: "owner",
    minWidth: 130
  },
  {
    label: "更新时间",
    prop: "updatedAt",
    minWidth: 160,
    formatter: ({ updatedAt }) => formatTimestamp(updatedAt)
  },
  {
    label: "操作",
    fixed: "right",
    minWidth: 160,
    slot: "operation"
  }
];

function normalizeList(values?: string[]) {
  return Array.from(
    new Set((values ?? []).map(item => item.trim()).filter(Boolean))
  ).sort();
}

function cleanText(value?: string) {
  const text = value?.trim();
  return text || undefined;
}

function fillPageParams() {
  searchFormParams.pageNum = pagination.currentPage;
  searchFormParams.pageSize = pagination.pageSize;
}

function fillForm(data?: ServiceClientDTO) {
  Object.assign(clientForm, initialForm(), {
    serviceId: data?.serviceId ?? "",
    serviceSecret: dialogMode.value === "add" ? "" : undefined,
    name: data?.name ?? "",
    description: data?.description ?? "",
    allowedScopes: data?.allowedScopes?.length ? data.allowedScopes : ["read"],
    allowedAudiences: data?.allowedAudiences?.length
      ? data.allowedAudiences
      : ["admin-backend"],
    active: data?.active ?? true,
    integrationType: data?.integrationType ?? "internal",
    introspectionAllowed: data?.introspectionAllowed ?? true,
    tokenTtlSeconds: data?.tokenTtlSeconds ?? 3600,
    owner: data?.owner ?? "",
    contact: data?.contact ?? ""
  });
  clientFormRef.value?.clearValidate();
}

function sanitizeCreateForm(): ServiceClientRequest {
  return {
    serviceId: clientForm.serviceId.trim(),
    serviceSecret: clientForm.serviceSecret?.trim() ?? "",
    name: clientForm.name.trim(),
    description: cleanText(clientForm.description),
    allowedScopes: normalizeList(clientForm.allowedScopes),
    allowedAudiences: normalizeList(clientForm.allowedAudiences),
    integrationType: cleanText(clientForm.integrationType) ?? "internal",
    introspectionAllowed: clientForm.introspectionAllowed,
    tokenTtlSeconds: clientForm.tokenTtlSeconds,
    owner: cleanText(clientForm.owner),
    contact: cleanText(clientForm.contact)
  };
}

function sanitizeUpdateForm(): UpdateServiceClientRequest {
  return {
    name: clientForm.name.trim(),
    description: cleanText(clientForm.description),
    allowedScopes: normalizeList(clientForm.allowedScopes),
    allowedAudiences: normalizeList(clientForm.allowedAudiences),
    active: clientForm.active,
    integrationType: cleanText(clientForm.integrationType) ?? "internal",
    introspectionAllowed: clientForm.introspectionAllowed,
    tokenTtlSeconds: clientForm.tokenTtlSeconds,
    owner: cleanText(clientForm.owner),
    contact: cleanText(clientForm.contact)
  };
}

function formatTimestamp(value?: number) {
  if (!value) return "-";
  const timestamp = value < 1000000000000 ? value * 1000 : value;
  return dayjs(timestamp).format("YYYY-MM-DD HH:mm:ss");
}

function generateSecret() {
  const bytes = new Uint8Array(32);
  if (window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index++) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  clientForm.serviceSecret = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function getList() {
  fillPageParams();
  pageLoading.value = true;
  const { data } = await getServiceClientListApi(
    toRaw(searchFormParams)
  ).finally(() => {
    pageLoading.value = false;
  });
  dataList.value = data.rows;
  pagination.total = data.total;
}

function onSearch() {
  pagination.currentPage = 1;
  getList();
}

function resetForm(formEl?: FormInstance) {
  if (!formEl) return;
  formEl.resetFields();
  onSearch();
}

async function openDialog(mode: DialogMode, row?: ServiceClientDTO) {
  if (mode !== "add" && !row?.serviceId) {
    message("请选择服务客户端", { type: "warning" });
    return;
  }

  dialogMode.value = mode;
  dialogTitle.value =
    mode === "add"
      ? "新增服务客户端"
      : mode === "edit"
      ? "修改服务客户端"
      : "服务客户端详情";

  if (mode === "add") {
    fillForm();
  } else {
    const { data } = await getServiceClientDetailApi(row.serviceId);
    fillForm(data);
  }
  dialogVisible.value = true;
}

async function submit() {
  const valid = await clientFormRef.value?.validate().catch(() => false);
  if (!valid) return;

  submitLoading.value = true;
  try {
    if (dialogMode.value === "add") {
      const { data } = await addServiceClientApi(sanitizeCreateForm());
      message(`服务客户端 ${data.serviceId} 注册成功`, { type: "success" });
    } else {
      const { data } = await updateServiceClientApi(
        clientForm.serviceId,
        sanitizeUpdateForm()
      );
      message(`服务客户端 ${data.serviceId} 修改成功`, { type: "success" });
    }
    dialogVisible.value = false;
    getList();
  } finally {
    submitLoading.value = false;
  }
}

onMounted(() => {
  getList();
});
</script>

<template>
  <div class="main service-client-page">
    <el-form
      ref="searchFormRef"
      :inline="true"
      :model="searchFormParams"
      class="search-form bg-bg_color w-[99/100] pl-8 pt-[12px]"
    >
      <el-form-item label="服务ID：" prop="serviceId">
        <el-input
          v-model="searchFormParams.serviceId"
          placeholder="请输入服务ID"
          clearable
          class="!w-[180px]"
        />
      </el-form-item>
      <el-form-item label="服务名称：" prop="name">
        <el-input
          v-model="searchFormParams.name"
          placeholder="请输入服务名称"
          clearable
          class="!w-[180px]"
        />
      </el-form-item>
      <el-form-item label="集成类型：" prop="integrationType">
        <el-select
          v-model="searchFormParams.integrationType"
          placeholder="请选择"
          clearable
          class="!w-[160px]"
        >
          <el-option
            v-for="item in integrationTypeOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="状态：" prop="active">
        <el-select
          v-model="searchFormParams.active"
          placeholder="请选择"
          clearable
          class="!w-[140px]"
        >
          <el-option label="启用" :value="true" />
          <el-option label="停用" :value="false" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          :icon="useRenderIcon(Search)"
          :loading="pageLoading"
          @click="onSearch"
        >
          搜索
        </el-button>
        <el-button
          :icon="useRenderIcon(Refresh)"
          @click="resetForm(searchFormRef)"
        >
          重置
        </el-button>
      </el-form-item>
    </el-form>

    <PureTableBar title="服务客户端" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button
          type="primary"
          :icon="useRenderIcon(AddFill)"
          @click="openDialog('add')"
        >
          新增服务
        </el-button>
      </template>
      <template v-slot="{ size, dynamicColumns }">
        <pure-table
          border
          adaptive
          align-whole="center"
          table-layout="auto"
          :loading="pageLoading"
          :size="size"
          :data="dataList"
          :columns="dynamicColumns"
          :pagination="pagination"
          :paginationSmall="size === 'small' ? true : false"
          :header-cell-style="{
            background: 'var(--el-table-row-hover-bg-color)',
            color: 'var(--el-text-color-primary)'
          }"
          @page-size-change="getList"
          @page-current-change="getList"
        >
          <template #allowedScopes="{ row }">
            <el-tag
              v-for="item in row.allowedScopes ?? []"
              :key="item"
              class="tag-item"
              effect="plain"
            >
              {{ item }}
            </el-tag>
          </template>
          <template #allowedAudiences="{ row }">
            <el-tag
              v-for="item in row.allowedAudiences ?? []"
              :key="item"
              class="tag-item"
              type="info"
              effect="plain"
            >
              {{ item }}
            </el-tag>
          </template>
          <template #active="{ row }">
            <el-tag :type="row.active ? 'success' : 'danger'" effect="plain">
              {{ row.active ? "启用" : "停用" }}
            </el-tag>
          </template>
          <template #operation="{ row }">
            <el-button
              class="reset-margin"
              link
              type="primary"
              :size="size"
              :icon="useRenderIcon(EditPen)"
              @click="openDialog('edit', row)"
            >
              修改
            </el-button>
          </template>
        </pure-table>
      </template>
    </PureTableBar>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="760px"
      destroy-on-close
      draggable
    >
      <el-form
        ref="clientFormRef"
        :model="clientForm"
        :rules="rules"
        :disabled="dialogMode === 'detail'"
        label-width="106px"
      >
        <el-row :gutter="24">
          <el-col :xs="24" :md="12">
            <el-form-item label="服务ID" prop="serviceId">
              <el-input
                v-model="clientForm.serviceId"
                :disabled="dialogMode !== 'add'"
                clearable
                placeholder="order-svc"
              />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="12">
            <el-form-item label="服务名称" prop="name">
              <el-input
                v-model="clientForm.name"
                clearable
                placeholder="Order Service"
              />
            </el-form-item>
          </el-col>

          <el-col v-if="dialogMode === 'add'" :xs="24">
            <el-form-item label="服务密钥" prop="serviceSecret">
              <div class="secret-row">
                <el-input
                  v-model="clientForm.serviceSecret"
                  show-password
                  clearable
                  placeholder="请输入服务密钥"
                />
                <el-button
                  :icon="useRenderIcon(Refresh)"
                  @click="generateSecret"
                >
                  生成
                </el-button>
              </div>
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="12">
            <el-form-item label="Scope" prop="allowedScopes">
              <el-select
                v-model="clientForm.allowedScopes"
                multiple
                filterable
                allow-create
                default-first-option
                class="w-full"
                placeholder="请输入或选择Scope"
              >
                <el-option label="read" value="read" />
                <el-option label="write" value="write" />
                <el-option label="user.read" value="user.read" />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="12">
            <el-form-item label="Audience" prop="allowedAudiences">
              <el-select
                v-model="clientForm.allowedAudiences"
                multiple
                filterable
                allow-create
                default-first-option
                class="w-full"
                placeholder="请输入或选择Audience"
              >
                <el-option label="admin-backend" value="admin-backend" />
                <el-option label="*" value="*" />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="12">
            <el-form-item label="集成类型" prop="integrationType">
              <el-select
                v-model="clientForm.integrationType"
                filterable
                allow-create
                class="w-full"
              >
                <el-option
                  v-for="item in integrationTypeOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="12">
            <el-form-item label="Token TTL" prop="tokenTtlSeconds">
              <el-input-number
                v-model="clientForm.tokenTtlSeconds"
                :min="1"
                :step="300"
                controls-position="right"
                class="w-full"
              />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="12">
            <el-form-item label="允许内省" prop="introspectionAllowed">
              <el-switch
                v-model="clientForm.introspectionAllowed"
                active-text="允许"
                inactive-text="禁止"
              />
            </el-form-item>
          </el-col>

          <el-col v-if="dialogMode !== 'add'" :xs="24" :md="12">
            <el-form-item label="状态" prop="active">
              <el-switch
                v-model="clientForm.active"
                active-text="启用"
                inactive-text="停用"
              />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="12">
            <el-form-item label="负责人" prop="owner">
              <el-input
                v-model="clientForm.owner"
                clearable
                placeholder="Platform Team"
              />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="12">
            <el-form-item label="联系方式" prop="contact">
              <el-input
                v-model="clientForm.contact"
                clearable
                placeholder="platform@example.com"
              />
            </el-form-item>
          </el-col>

          <el-col :xs="24">
            <el-form-item label="描述" prop="description">
              <el-input
                v-model="clientForm.description"
                type="textarea"
                :rows="4"
                maxlength="512"
                show-word-limit
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button
          v-if="dialogMode !== 'detail'"
          type="primary"
          :loading="submitLoading"
          @click="submit"
        >
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.service-client-page {
  .search-form {
    :deep(.el-form-item) {
      margin-bottom: 12px;
    }
  }

  .tag-item {
    margin-right: 4px;
    margin-bottom: 4px;
  }

  .secret-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
    width: 100%;
  }
}

@media (width <= 768px) {
  .service-client-page {
    .secret-row {
      grid-template-columns: 1fr;
    }
  }
}
</style>
