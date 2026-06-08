<script setup lang="ts">
import {
  onBeforeMount,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch
} from "vue";
import Motion from "./utils/motion";
import { useRouter } from "vue-router";
import { message } from "@/utils/message";
import { loginRules } from "./utils/rule";
import TypeIt from "@/components/ReTypeit";
import { useNav } from "@/layout/hooks/useNav";
import type { FormInstance } from "element-plus";
import { useLayout } from "@/layout/hooks/useLayout";
import { rsaEncrypt } from "@/utils/crypt";
import { getTopMenu, initRouter } from "@/router/utils";
import { avatar } from "./utils/static";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { ElMessageBox } from "element-plus";
import {
  getIsRememberMe,
  getPassword,
  removePassword,
  saveIsRememberMe,
  savePassword,
  setTokenFromBackend
} from "@/utils/auth";

import Lock from "@iconify-icons/ri/lock-fill";
import User from "@iconify-icons/ri/user-3-fill";
import * as CommonAPI from "@/api/common/login";
import { useUserStoreHook } from "@/store/modules/user";
const LOGIN_ACCOUNT_ALREADY_LOGGED_IN = 10210;

defineOptions({
  name: "Login"
});

// TODO 当请求验证码过于频繁的话  服务器会报错  但是前端没有反应 这块需要处理一下, 通过axios处理一下
const captchaCodeBase64 = ref("");

const isCaptchaOn = ref(false);

const router = useRouter();
const loading = ref(false);
const isRememberMe = ref(false);
const pendingForceLogin = ref(false);
const ruleFormRef = ref<FormInstance>();

const { initStorage } = useLayout();
initStorage();
// const { title, getDropdownItemStyle, getDropdownItemClass } = useNav();
const { title } = useNav();

const ruleForm = reactive({
  username: "admin",
  password: getPassword(),
  captchaCode: "",
  captchaCodeKey: ""
});

const finishLogin = (data: CommonAPI.TokenDTO) => {
  setTokenFromBackend(data);
  useUserStoreHook().SET_USERNAME(data.currentUser.userInfo.username);
  useUserStoreHook().SET_ROLES([data.currentUser.roleKey]);
  initRouter().then(() => {
    router.push(getTopMenu(true).path);
    message("登录成功", { type: "success" });
  });
  if (isRememberMe.value) {
    savePassword(ruleForm.password);
  }
};

const submitLogin = async (forceLogin = false) => {
  const rsaPublicKeyRes = await CommonAPI.getRsaPublicKey();
  const response = await CommonAPI.loginByPassword({
    username: ruleForm.username,
    password: rsaEncrypt(ruleForm.password, rsaPublicKeyRes.data.publicKey),
    captchaCode: ruleForm.captchaCode,
    captchaCodeKey: ruleForm.captchaCodeKey,
    forceLogin
  });
  finishLogin(response.data);
};

const onLogin = async (formEl: FormInstance | undefined) => {
  loading.value = true;
  if (!formEl) {
    loading.value = false;
    return;
  }

  const valid = await formEl.validate().catch(() => false);
  if (!valid) {
    loading.value = false;
    return;
  }

  try {
    await submitLogin(pendingForceLogin.value);
    pendingForceLogin.value = false;
  } catch (error: any) {
    if (error?.code === LOGIN_ACCOUNT_ALREADY_LOGGED_IN) {
      pendingForceLogin.value = false;
      loading.value = false;
      try {
        await ElMessageBox.confirm(
          "该账号已有在线会话。继续登录会踢出旧会话，是否继续？",
          "账号已登录",
          {
            confirmButtonText: "强制登录",
            cancelButtonText: "取消",
            type: "warning"
          }
        );
        loading.value = true;
        if (isCaptchaOn.value) {
          message("请重新输入验证码后再强制登录", { type: "warning" });
          pendingForceLogin.value = true;
          await getCaptchaCode();
          ruleForm.captchaCode = "";
          return;
        }
        await submitLogin(true);
      } catch {
        // 用户取消或强制登录失败时，回到登录页等待用户处理。
      } finally {
        loading.value = false;
      }
      return;
    }
    loading.value = false;
    //如果登陆失败则重新获取验证码
    getCaptchaCode();
  }
};

/** 使用公共函数，避免`removeEventListener`失效 */
function onkeypress({ code }: KeyboardEvent) {
  if (code === "Enter") {
    onLogin(ruleFormRef.value);
  }
}

async function getCaptchaCode() {
  if (isCaptchaOn.value) {
    await CommonAPI.getCaptchaCode().then(res => {
      captchaCodeBase64.value = `data:image/gif;base64,${res.data.captchaCodeImg}`;
      ruleForm.captchaCodeKey = res.data.captchaCodeKey;
    });
  }
}

watch(isRememberMe, newVal => {
  saveIsRememberMe(newVal);
  if (newVal === false) {
    removePassword();
  }
});

onBeforeMount(async () => {
  try {
    const { data } = await CommonAPI.getConfig();
    isCaptchaOn.value = data.isCaptchaOn;
    useUserStoreHook().SET_DICTIONARY(data.dictionary);
  } catch {
    isCaptchaOn.value = false;
    useUserStoreHook().SET_DICTIONARY(new Map());
  }

  await getCaptchaCode();

  isRememberMe.value = getIsRememberMe();
  if (isRememberMe.value) {
    ruleForm.password = getPassword();
  }
});

onMounted(() => {
  window.document.addEventListener("keypress", onkeypress);
});

onBeforeUnmount(() => {
  window.document.removeEventListener("keypress", onkeypress);
});
</script>

<template>
  <div class="select-none">
    <div class="login-page">
      <div class="login-card">
        <div class="login-left">
          <div class="bg-circle bg-circle-1" />
          <div class="bg-circle bg-circle-2" />
          <div class="bg-circle bg-circle-3" />
          <div class="login-left-content">
            <avatar class="left-logo" />
            <h1 class="left-title">船舶参数配置平台</h1>
            <p class="left-subtitle">专业的船舶参数管理与配置系统</p>
          </div>
        </div>
        <div class="login-box">
          <div class="login-form">
            <!-- 登录窗口上面的LOGO -->
            <avatar class="avatar" />
            <Motion>
              <h2 class="outline-none">
                <TypeIt :cursor="false" :speed="150" :values="[title]" />
              </h2>
            </Motion>

            <el-form
              ref="ruleFormRef"
              :model="ruleForm"
              :rules="loginRules"
              size="large"
            >
              <Motion :delay="100">
                <el-form-item
                  :rules="[
                    {
                      required: true,
                      message: '请输入账号',
                      trigger: 'blur'
                    }
                  ]"
                  prop="username"
                >
                  <el-input
                    v-model="ruleForm.username"
                    :prefix-icon="useRenderIcon(User)"
                    clearable
                    placeholder="账号"
                  />
                </el-form-item>
              </Motion>

              <Motion :delay="150">
                <el-form-item prop="password">
                  <el-input
                    v-model="ruleForm.password"
                    :prefix-icon="useRenderIcon(Lock)"
                    clearable
                    placeholder="密码"
                    show-password
                  />
                </el-form-item>
              </Motion>

              <Motion :delay="200">
                <el-form-item>
                  <el-checkbox v-model="isRememberMe">记住密码</el-checkbox>
                  <el-button
                    :loading="loading"
                    class="w-full mt-4"
                    size="default"
                    type="primary"
                    @click="onLogin(ruleFormRef)"
                  >
                    登录
                  </el-button>
                </el-form-item>
              </Motion>
            </el-form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url("@/style/login.css");
</style>

<style lang="scss" scoped>
:deep(.el-input-group__append, .el-input-group__prepend) {
  padding: 0;
}

.translation {
  ::v-deep(.el-dropdown-menu__item) {
    padding: 5px 40px;
  }

  .check-zh {
    position: absolute;
    left: 20px;
  }

  .check-en {
    position: absolute;
    left: 20px;
  }
}
</style>
