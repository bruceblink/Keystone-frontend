<script setup lang="ts">
/**
 * 软件版本发布页（左右布局）
 *
 * 左侧 PublishForm：填写版本信息 + 分片上传软件包（useChunkUpload）
 * 右侧 VersionList：已发布版本列表（useVersionList）
 *
 * 发布流程：左侧上传完成拿到 fileUrl → emit publish → 本页调用 publishVersion → POST /device/version/add
 */
import { ref } from "vue";
import { ElMessage } from "element-plus";
import PublishForm from "./components/PublishForm.vue";
import VersionList from "./components/VersionList.vue";

defineOptions({ name: "BoatVersion" });

const publishFormRef = ref<InstanceType<typeof PublishForm> | null>(null);
const versionListRef = ref<InstanceType<typeof VersionList> | null>(null);

/** 左侧发布表单提交：委托右侧列表 composable 调用新增接口 */
async function onPublish(payload: {
  ver_name: string;
  version: string;
  ver_des: string;
  client_path: string;
  filename: string;
  fileSize: number;
  fileUrl: string;
}) {
  try {
    const ok = await versionListRef.value?.publishVersion(payload);
    if (ok === false) {
      ElMessage.error(
        `软件「${payload.ver_name}」的版本号「${payload.version}」已存在`
      );
      return;
    }
    ElMessage.success("版本发布成功");
    publishFormRef.value?.reset();
  } catch (err) {
    console.error("[version] 发布失败:", err);
    ElMessage.error("版本发布失败");
  }
}
</script>

<template>
  <div class="version-page">
    <!-- 左：发布 + 分片上传；右：版本列表 -->
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
