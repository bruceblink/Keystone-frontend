<script setup lang="ts">
import { ref, reactive, computed, watch } from "vue";
import {
  ElMessage,
  ElMessageBox,
  type FormRules,
  type FormInstance
} from "element-plus";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import Upload from "@iconify-icons/ep/upload";
import Refresh from "@iconify-icons/ep/refresh";
import { useFileUpload } from "../utils";

interface PublishPayload {
  ver_name: string;
  version: string;
  ver_des: string;
  client_path: string;
  filename: string;
  fileSize: number;
}

const emit = defineEmits<{
  publish: [payload: PublishPayload];
}>();

const {
  selectedFile,
  uploading,
  isPaused,
  isMerging,
  isMerged,
  uploadPercentage,
  uploadSpeed,
  timeLeft,
  uploadStatus,
  mergedFileName,
  mergedFileSize,
  selectFile,
  startUpload,
  pauseUpload,
  resumeUpload,
  handleReupload,
  resetState,
  formatFileSize
} = useFileUpload();

const formRef = ref<FormInstance | null>(null);
const publishing = ref(false);

const form = reactive({
  ver_name: "",
  version: "",
  ver_des: "",
  client_path: ""
});

const isFormComplete = computed(
  () =>
    !!form.ver_name && !!form.version && !!form.ver_des && !!form.client_path
);

const formRules: FormRules = {
  ver_name: [
    { required: true, message: "请输入软件名称", trigger: "blur" },
    {
      min: 2,
      max: 50,
      message: "软件名称长度在 2-50 个字符之间",
      trigger: "blur"
    }
  ],
  version: [
    { required: true, message: "请输入版本号", trigger: "blur" },
    {
      validator: (_rule, value, callback) => {
        if (!value) {
          callback();
          return;
        }
        if (!/^v?\d+\.\d+\.\d+$/.test(value)) {
          callback(new Error("版本号格式不正确，如：1.2.3"));
        } else {
          callback();
        }
      },
      trigger: "blur"
    }
  ],
  ver_des: [{ required: true, message: "请输入发布说明", trigger: "blur" }],
  client_path: [
    { required: true, message: "请输入存储路径", trigger: "blur" },
    {
      validator: (_rule, value, callback) => {
        if (!value) {
          callback();
          return;
        }
        if (!/^[/\\]?[\w\-./ \\]+$/.test(value))
          callback(
            new Error("路径只能包含字母、数字、下划线、连字符、点和斜杠")
          );
        else callback();
      },
      trigger: "blur"
    }
  ]
};

watch(
  () => form.ver_name,
  () => {
    if (form.version) formRef.value?.validateField("version");
  }
);

// ===== 文件区域 =====
const fileInputRef = ref<HTMLInputElement | null>(null);
const isDragOver = ref(false);

function triggerFileInput() {
  if (!isFormComplete.value) {
    ElMessage.warning("请先填写完整的表单信息");
    return;
  }
  fileInputRef.value?.click();
}

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) selectFile(file);
  (e.target as HTMLInputElement).value = "";
}

function onDrop(e: DragEvent) {
  e.preventDefault();
  isDragOver.value = false;
  if (!isFormComplete.value) {
    ElMessage.warning("请先填写完整的表单信息");
    return;
  }
  const file = e.dataTransfer?.files?.[0];
  if (file) selectFile(file);
}

// ===== 发布 =====
function handlePublish() {
  formRef.value?.validate((valid: boolean) => {
    if (!valid) return;
    if (!isMerged.value) {
      ElMessage.error("请先上传软件包/模型文件");
      return;
    }
    ElMessageBox.confirm(
      `确定要发布「${form.ver_name} ${form.version}」吗？`,
      "确认发布",
      {
        confirmButtonText: "确定发布",
        cancelButtonText: "取消",
        type: "warning"
      }
    )
      .then(() => {
        publishing.value = true;
        emit("publish", {
          ver_name: form.ver_name,
          version: form.version,
          ver_des: form.ver_des,
          client_path: form.client_path,
          filename: mergedFileName.value,
          fileSize: mergedFileSize.value
        });
        publishing.value = false;
      })
      .catch(() => {});
  });
}

function reset() {
  formRef.value?.resetFields();
  selectedFile.value = null;
  resetState();
}

defineExpose({ reset });
</script>

<template>
  <div class="publish-form">
    <div class="panel-header">
      <span class="panel-dot" />
      <span class="panel-title">软件版本发布</span>
    </div>

    <div class="panel-body">
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="90px"
        label-position="top"
        size="large"
      >
        <el-form-item label="软件名称" prop="ver_name">
          <el-input
            v-model="form.ver_name"
            placeholder="如：模型、检测软件、船端客户端等"
            clearable
            class="form-input"
          />
        </el-form-item>
        <el-form-item label="版本号" prop="version">
          <el-input
            v-model="form.version"
            :placeholder="
              form.ver_name
                ? `请输入${form.ver_name}的版本号，如：1.0.1`
                : '请输入版本号，如：1.0.1'
            "
            clearable
            :disabled="!form.ver_name"
            class="form-input"
          />
        </el-form-item>
        <el-form-item label="存储路径" prop="client_path">
          <el-input
            v-model="form.client_path"
            placeholder="如：/opt/software/bin"
            clearable
            class="form-input"
          />
        </el-form-item>
        <el-form-item label="发布说明" prop="ver_des">
          <el-input
            v-model="form.ver_des"
            type="textarea"
            :rows="3"
            placeholder="请输入版本更新说明，包括新功能、修复问题等"
            maxlength="500"
            show-word-limit
            class="form-input"
          />
        </el-form-item>

        <!-- 文件上传 -->
        <el-form-item label="软件包/模型">
          <div class="upload-wrap">
            <!-- 拖拽区 -->
            <div
              v-if="!selectedFile"
              class="upload-area"
              :class="{
                'is-dragover': isDragOver,
                'is-disabled': !isFormComplete
              }"
              @click="triggerFileInput"
              @drop="onDrop"
              @dragover.prevent="isDragOver = isFormComplete"
              @dragleave.prevent="isDragOver = false"
            >
              <input
                ref="fileInputRef"
                type="file"
                accept=".zip,.tar,.gz,.exe,.bin"
                style="display: none"
                @change="onFileChange"
              />
              <div class="upload-icon-wrap">
                <el-icon :size="36">
                  <component :is="useRenderIcon(Upload)" />
                </el-icon>
              </div>
              <p v-if="isFormComplete" class="upload-title">
                点击或拖拽文件到此处上传
              </p>
              <p v-else class="upload-title upload-title--disabled">
                请先填写完整的表单信息
              </p>
              <p class="upload-sub">.zip .tar .gz .exe .bin · 最大 1GB</p>
            </div>

            <!-- 已选文件 -->
            <div v-if="selectedFile" class="file-card">
              <div class="file-card-left">
                <div class="file-icon-box">
                  <el-icon :size="20">
                    <component :is="useRenderIcon('ep:document')" />
                  </el-icon>
                </div>
                <div class="file-info">
                  <span class="file-name">{{ selectedFile.name }}</span>
                  <span class="file-size">{{
                    formatFileSize(selectedFile.size)
                  }}</span>
                </div>
                <el-tag
                  v-if="isMerged"
                  type="success"
                  size="small"
                  round
                  class="ml-2"
                >
                  已上传完成
                </el-tag>
              </div>
              <div class="file-card-right">
                <el-button
                  type="primary"
                  size="small"
                  :icon="useRenderIcon(Upload)"
                  :disabled="uploading || isMerging || isMerged"
                  @click="startUpload"
                >
                  {{ isMerged ? "已上传" : "开始上传" }}
                </el-button>
                <el-button
                  size="small"
                  :icon="useRenderIcon(Refresh)"
                  :disabled="uploading || isMerging"
                  @click="handleReupload"
                >
                  重选
                </el-button>
              </div>
            </div>

            <!-- 上传进度 -->
            <div v-if="uploading && !isMerging" class="progress-card">
              <el-progress
                :percentage="Math.round(uploadPercentage)"
                :status="uploadStatus || undefined"
                :stroke-width="18"
                text-inside
              />
              <div class="progress-stats">
                <span>
                  <el-icon
                    ><component :is="useRenderIcon('ep:odometer')"
                  /></el-icon>
                  {{ uploadSpeed }} MB/s
                </span>
                <span>剩余 {{ timeLeft }} 秒</span>
                <div class="progress-btns">
                  <el-button
                    size="small"
                    type="warning"
                    plain
                    :disabled="isPaused"
                    @click="pauseUpload"
                    >暂停</el-button
                  >
                  <el-button
                    size="small"
                    type="success"
                    plain
                    :disabled="!isPaused"
                    @click="resumeUpload"
                    >继续</el-button
                  >
                </div>
              </div>
            </div>

            <!-- 合并中 -->
            <div v-if="isMerging" class="status-tip status-tip--info">
              <el-icon class="is-loading"
                ><component :is="useRenderIcon(Refresh)"
              /></el-icon>
              文件合并中，请稍候...
            </div>

            <!-- 上传完成 -->
            <div v-if="isMerged" class="status-tip status-tip--success">
              <el-icon
                ><component :is="useRenderIcon('ep:circle-check')"
              /></el-icon>
              上传成功 &nbsp;·&nbsp;
              <strong>{{ mergedFileName }}</strong>
              &nbsp;·&nbsp;
              {{ formatFileSize(mergedFileSize) }}
            </div>
          </div>
        </el-form-item>
      </el-form>
    </div>

    <!-- 操作按钮 -->
    <div class="form-actions">
      <el-button
        type="primary"
        size="large"
        :icon="useRenderIcon(Upload)"
        :loading="publishing"
        @click="handlePublish"
      >
        发布版本
      </el-button>
      <el-button size="large" :icon="useRenderIcon(Refresh)" @click="reset">
        重置
      </el-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.publish-form {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  width: 44%;
  overflow: hidden;
}

.panel-header {
  display: flex;
  flex-shrink: 0;
  gap: 10px;
  align-items: center;
  padding: 18px 24px 16px;
  background: var(--el-fill-color-lighter);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.panel-dot {
  flex-shrink: 0;
  width: 4px;
  height: 18px;
  background: var(--el-color-primary);
  border-radius: 2px;
}

.panel-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  letter-spacing: 0.4px;
}

.panel-body {
  flex: 1;
  min-height: 0;
  padding: 24px 32px 0;
  overflow-y: auto;

  :deep(.el-form-item) {
    margin-bottom: 20px;
  }

  :deep(.el-form-item__label) {
    height: auto;
    padding-bottom: 6px;
    font-size: 14px;
    font-weight: 600;
    line-height: 1.5;
  }

  :deep(.el-input__wrapper) {
    padding: 0 14px;
  }

  :deep(.el-input__inner) {
    height: 42px;
    font-size: 15px;
  }

  :deep(.el-textarea__inner) {
    padding: 10px 14px;
    font-size: 15px;
    line-height: 1.7;
  }

  :deep(.el-input--large .el-input__wrapper) {
    padding: 0 14px;
  }
}

.form-input {
  width: 100%;
}

.form-actions {
  display: flex;
  flex-shrink: 0;
  gap: 16px;
  justify-content: center;
  padding: 18px 0 22px;
  margin-top: 6px;
  border-top: 1px solid var(--el-border-color-lighter);

  :deep(.el-button) {
    min-width: 120px;
    font-size: 14px;
  }
}

/* ===== 上传区域 ===== */
.upload-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.upload-area {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  justify-content: center;
  padding: 44px 20px;
  cursor: pointer;
  user-select: none;
  background: var(--el-fill-color-lighter);
  border: 1.5px dashed var(--el-border-color);
  border-radius: 10px;
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;

  &:hover:not(.is-disabled) {
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary);
    box-shadow: 0 0 0 3px var(--el-color-primary-light-8);
  }

  &.is-dragover {
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary);
    box-shadow: 0 0 0 3px var(--el-color-primary-light-8);
  }

  &.is-disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
}

.upload-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  margin-bottom: 6px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-8);
  border-radius: 50%;
}

.upload-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);

  &--disabled {
    font-weight: 400;
    color: var(--el-text-color-placeholder);
  }
}

.upload-sub {
  margin: 0;
  font-size: 14px;
  color: var(--el-text-color-placeholder);
}

/* ===== 文件卡片 ===== */
.file-card {
  display: flex;
  gap: 14px;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-7);
  border-radius: 10px;
}

.file-card-left {
  display: flex;
  gap: 12px;
  align-items: center;
  min-width: 0;
}

.file-icon-box {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-8);
  border-radius: 10px;
}

.file-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;

  .file-name {
    max-width: 180px;
    overflow: hidden;
    font-size: 14px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-size {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

.file-card-right {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
}

.ml-2 {
  margin-left: 6px;
}

/* ===== 上传进度 ===== */
.progress-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 18px;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
}

.progress-stats {
  display: flex;
  gap: 16px;
  align-items: center;
  font-size: 13px;
  color: var(--el-text-color-secondary);

  span {
    display: flex;
    gap: 4px;
    align-items: center;
  }
}

.progress-btns {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

/* ===== 状态提示条 ===== */
.status-tip {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 12px 16px;
  font-size: 14px;
  border-radius: 10px;

  &--info {
    color: var(--el-color-info);
    background: var(--el-color-info-light-9);
    border: 1px solid var(--el-color-info-light-7);
  }

  &--success {
    color: var(--el-color-success);
    background: var(--el-color-success-light-9);
    border: 1px solid var(--el-color-success-light-7);
  }
}
</style>
