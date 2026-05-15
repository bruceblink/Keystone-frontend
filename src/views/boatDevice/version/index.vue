<script setup lang="ts">
import { ref } from "vue";
import { ElMessage } from "element-plus";
import PublishForm from "./components/PublishForm.vue";
import VersionList from "./components/VersionList.vue";

defineOptions({ name: "BoatVersion" });

const publishFormRef = ref<InstanceType<typeof PublishForm> | null>(null);
const versionListRef = ref<InstanceType<typeof VersionList> | null>(null);

function onPublish(payload: {
  ver_name: string;
  version: string;
  ver_des: string;
  client_path: string;
  filename: string;
  fileSize: number;
}) {
  const ok = versionListRef.value?.addVersion(
    {
      ver_name: payload.ver_name,
      version: payload.version,
      ver_des: payload.ver_des,
      client_path: payload.client_path,
      fileUrl: `/mock/files/${payload.filename}`,
      md5: "",
      size: "",
      filename: payload.filename
    },
    payload.filename,
    payload.fileSize
  );

  if (ok === false) {
    ElMessage.error(
      `软件"${payload.ver_name}"的版本号"${payload.version}"已存在`
    );
    return;
  }

  ElMessage.success("版本发布成功");
  publishFormRef.value?.reset();
}
</script>

<template>
  <div class="version-page">
    <div class="content-wrap">
      <PublishForm ref="publishFormRef" @publish="onPublish" />
      <div class="divider" />
      <VersionList ref="versionListRef" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.version-page {
  box-sizing: border-box;
  padding: 20px;
}

.content-wrap {
  display: flex;
  gap: 0;
  height: calc(100vh - 172px);
  min-height: 520px;
  overflow: hidden;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  box-shadow: 0 2px 16px rgb(0 0 0 / 7%);
}

.divider {
  flex-shrink: 0;
  width: 1px;
  margin: 20px 0;
  background: var(--el-border-color-lighter);
}
</style>
