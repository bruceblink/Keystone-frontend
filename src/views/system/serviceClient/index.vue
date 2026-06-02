<script setup lang="ts">
import { reactive, ref } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { message } from "@/utils/message";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { addServiceClientApi } from "@/api/system/serviceClient";
import type {
  ServiceClientDTO,
  ServiceClientRequest
} from "@/api/system/serviceClient";

import Save from "@iconify-icons/ri/save-3-line";
import Refresh from "@iconify-icons/ep/refresh";
import Delete from "@iconify-icons/ep/delete";

defineOptions({
  name: "SystemServiceClient"
});

type ServiceClientForm = ServiceClientRequest;

const formRef = ref<FormInstance>();
const submitLoading = ref(false);
const result = ref<ServiceClientDTO>();

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
  integrationType: "internal",
  introspectionAllowed: true,
  tokenTtlSeconds: 3600,
  owner: "",
  contact: ""
});

const form = reactive<ServiceClientForm>(initialForm());

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
    { required: true, message: "请输入服务客户端ID", trigger: "blur" },
    { max: 128, message: "长度不能超过128个字符", trigger: "blur" }
  ],
  serviceSecret: [
    { required: true, message: "请输入服务客户端密钥", trigger: "blur" },
    { max: 256, message: "长度不能超过256个字符", trigger: "blur" }
  ],
  name: [
    { required: true, message: "请输入服务客户端名称", trigger: "blur" },
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

function normalizeList(values?: string[]) {
  return Array.from(
    new Set((values ?? []).map(item => item.trim()).filter(Boolean))
  ).sort();
}

function sanitizeForm(): ServiceClientRequest {
  return {
    ...form,
    serviceId: form.serviceId.trim(),
    serviceSecret: form.serviceSecret.trim(),
    name: form.name.trim(),
    description: form.description?.trim() || undefined,
    allowedScopes: normalizeList(form.allowedScopes),
    allowedAudiences: normalizeList(form.allowedAudiences),
    integrationType: form.integrationType?.trim() || "internal",
    owner: form.owner?.trim() || undefined,
    contact: form.contact?.trim() || undefined
  };
}

async function submit() {
  await formRef.value?.validate(async valid => {
    if (!valid) return;
    submitLoading.value = true;
    try {
      const { data } = await addServiceClientApi(sanitizeForm());
      result.value = data;
      message(`服务客户端 ${data.serviceId} 注册成功`, { type: "success" });
    } finally {
      submitLoading.value = false;
    }
  });
}

function reset() {
  Object.assign(form, initialForm());
  result.value = undefined;
  formRef.value?.clearValidate();
}

function generateSecret() {
  form.serviceSecret = randomSecret();
}

function randomSecret() {
  const bytes = new Uint8Array(32);
  if (window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index++) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
</script>

<template>
  <div class="main service-client-page">
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="128px"
      class="service-client-form bg-bg_color"
    >
      <el-row :gutter="24">
        <el-col :xs="24" :md="12">
          <el-form-item label="服务ID" prop="serviceId">
            <el-input
              v-model="form.serviceId"
              clearable
              placeholder="order-svc"
            />
          </el-form-item>
        </el-col>

        <el-col :xs="24" :md="12">
          <el-form-item label="服务名称" prop="name">
            <el-input
              v-model="form.name"
              clearable
              placeholder="Order Service"
            />
          </el-form-item>
        </el-col>

        <el-col :xs="24">
          <el-form-item label="服务密钥" prop="serviceSecret">
            <div class="secret-row">
              <el-input
                v-model="form.serviceSecret"
                show-password
                clearable
                placeholder="请输入服务密钥"
              />
              <el-button :icon="useRenderIcon(Refresh)" @click="generateSecret">
                生成
              </el-button>
            </div>
          </el-form-item>
        </el-col>

        <el-col :xs="24" :md="12">
          <el-form-item label="Scope" prop="allowedScopes">
            <el-select
              v-model="form.allowedScopes"
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
              v-model="form.allowedAudiences"
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
              v-model="form.integrationType"
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
              v-model="form.tokenTtlSeconds"
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
              v-model="form.introspectionAllowed"
              active-text="允许"
              inactive-text="禁止"
            />
          </el-form-item>
        </el-col>

        <el-col :xs="24" :md="12">
          <el-form-item label="负责人" prop="owner">
            <el-input
              v-model="form.owner"
              clearable
              placeholder="Platform Team"
            />
          </el-form-item>
        </el-col>

        <el-col :xs="24" :md="12">
          <el-form-item label="联系方式" prop="contact">
            <el-input
              v-model="form.contact"
              clearable
              placeholder="platform@example.com"
            />
          </el-form-item>
        </el-col>

        <el-col :xs="24">
          <el-form-item label="描述" prop="description">
            <el-input
              v-model="form.description"
              type="textarea"
              :rows="4"
              maxlength="512"
              show-word-limit
            />
          </el-form-item>
        </el-col>
      </el-row>

      <div class="form-actions">
        <el-button
          type="primary"
          :icon="useRenderIcon(Save)"
          :loading="submitLoading"
          @click="submit"
        >
          注册
        </el-button>
        <el-button :icon="useRenderIcon(Delete)" @click="reset">清空</el-button>
      </div>

      <el-alert
        v-if="result"
        class="result-alert"
        type="success"
        show-icon
        :closable="false"
        :title="`已注册：${result.serviceId}`"
        :description="result.message"
      />
    </el-form>
  </div>
</template>

<style scoped lang="scss">
.service-client-page {
  .service-client-form {
    width: 100%;
    max-width: 1120px;
    padding: 24px 24px 20px;
  }

  .secret-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
    width: 100%;
  }

  .form-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-start;
    padding-left: 128px;
  }

  .result-alert {
    margin-top: 18px;
  }
}

@media (width <= 768px) {
  .service-client-page {
    .service-client-form {
      padding: 16px 12px;
    }

    .secret-row {
      grid-template-columns: 1fr;
    }

    .form-actions {
      padding-left: 0;
    }
  }
}
</style>
