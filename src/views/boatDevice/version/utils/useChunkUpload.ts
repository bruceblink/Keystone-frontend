/**
 * 软件包分片上传 composable
 *
 * 对接接口：
 * - POST /api/Flie/chunk        上传单个分片
 * - GET  /api/Flie/status/{id}  轮询合并进度，合并完成后返回 fileUrl
 *
 * 流程：选文件 → 按片上传 → 全部分片完成后轮询状态 → 合并成功得到 fileUrl → 供发布版本使用
 */
import { ref, onUnmounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  getChunkUploadStatus,
  uploadFileChunk
} from "@/api/boatDevice/version";
import { formatFileSize } from "./dict";

/** 单片大小 25MB，与 ConfigurePlatform ReleaseSoftware 保持一致 */
const CHUNK_SIZE = 25 * 1024 * 1024;
/** 合并状态轮询间隔 */
const STATUS_CHECK_INTERVAL = 2000;
/** 等待服务端合并的最长时间 */
const STATUS_CHECK_TIMEOUT = 5 * 60 * 1000;

/** 上传时需携带的软件名、版本号（来自发布表单） */
export interface ChunkUploadMeta {
  ver_name: string;
  version: string;
}

/**
 * @param getMeta 读取当前表单中的 ver_name / version，每片上传时写入 FormData
 */
export function useChunkUpload(getMeta: () => ChunkUploadMeta) {
  // ----- 响应式 UI 状态 -----
  const selectedFile = ref<File | null>(null);
  const uploading = ref(false);
  const isPaused = ref(false);
  const isMerging = ref(false);
  const isMerged = ref(false);
  const uploadPercentage = ref(0);
  const uploadSpeed = ref("0");
  const timeLeft = ref(0);
  const uploadStatus = ref<"" | "success" | "exception">("");
  const mergedFileName = ref("");
  const mergedFileSize = ref(0);
  /** 合并完成后的下载地址，发布时写入 POST /device/version/add */
  const fileUrl = ref("");
  const uploadTime = ref<Date | null>(null);

  // ----- 非响应式上传会话状态 -----
  let fileIdentifier = "";
  let totalChunks = 0;
  let completedChunks = 0;
  let controller: AbortController | null = null;
  let statusCheckTimer: ReturnType<typeof setInterval> | null = null;
  let statusCheckStart = 0;
  let startTime = 0;
  let chunkQueue: number[] = [];
  let processing = false;

  const VALID_TYPES = /\.(zip|tar|gz|exe|bin)$/i;
  const MAX_SIZE_GB = 1;

  const validateFile = (file: File): string | null => {
    if (!VALID_TYPES.test(file.name))
      return "只能上传 .zip .tar .gz .exe .bin 格式的文件";
    if (file.size / 1024 / 1024 / 1024 > MAX_SIZE_GB)
      return "文件大小不能超过 1GB";
    return null;
  };

  const clearStatusCheck = () => {
    if (statusCheckTimer) {
      clearInterval(statusCheckTimer);
      statusCheckTimer = null;
    }
  };

  /** 重置上传会话（重选文件、离开页面时调用） */
  const resetState = () => {
    clearStatusCheck();
    if (controller) {
      controller.abort();
      controller = null;
    }
    uploading.value = false;
    isPaused.value = false;
    isMerging.value = false;
    isMerged.value = false;
    uploadPercentage.value = 0;
    uploadSpeed.value = "0";
    timeLeft.value = 0;
    uploadStatus.value = "";
    mergedFileName.value = "";
    mergedFileSize.value = 0;
    fileUrl.value = "";
    uploadTime.value = null;
    fileIdentifier = "";
    totalChunks = 0;
    completedChunks = 0;
    chunkQueue = [];
    processing = false;
  };

  const updateProgress = () => {
    if (!totalChunks) return;
    uploadPercentage.value = Math.min(
      100,
      Math.floor((completedChunks / totalChunks) * 100)
    );
  };

  /** 生成服务端用于关联各分片的唯一标识 */
  const generateFileIdentifier = (file: File) => {
    const randomId = Math.random().toString(36).slice(2, 15);
    return `${file.name}_${file.size}_${Date.now()}_${randomId}`;
  };

  /** 上传指定索引的分片 — POST /api/Flie/chunk */
  const uploadChunk = async (chunkIndex: number) => {
    const file = selectedFile.value!;
    const meta = getMeta();
    const chunkStart = chunkIndex * CHUNK_SIZE;
    const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, file.size);
    const chunkBlob = file.slice(chunkStart, chunkEnd);

    const formData = new FormData();
    formData.append("file", chunkBlob, file.name);
    formData.append("fileIdentifier", fileIdentifier);
    formData.append("chunkIndex", String(chunkIndex));
    formData.append("totalChunks", String(totalChunks));
    formData.append("fileName", file.name);
    formData.append("ver_name", meta.ver_name);
    formData.append("version", meta.version);

    const chunkStartTime = Date.now();
    const response = await uploadFileChunk(
      formData,
      (loaded, _total) => {
        const chunkElapsed = (Date.now() - chunkStartTime) / 1000;
        const chunkSpeed =
          chunkElapsed > 0
            ? (loaded / chunkElapsed / 1024 / 1024).toFixed(2)
            : "0";
        const totalElapsed = (Date.now() - startTime) / 1000;
        const totalUploaded = chunkIndex * CHUNK_SIZE + loaded;
        uploadSpeed.value =
          totalElapsed > 0
            ? (totalUploaded / totalElapsed / 1024 / 1024).toFixed(2)
            : chunkSpeed;
        const remaining = file.size - totalUploaded;
        timeLeft.value =
          Number(uploadSpeed.value) > 0
            ? Math.floor(remaining / (Number(uploadSpeed.value) * 1024 * 1024))
            : 0;
      },
      controller?.signal
    );

    if (
      response?.success === true ||
      response?.code === 200 ||
      response?.code === 0
    ) {
      completedChunks++;
      updateProgress();
    } else {
      throw new Error(
        (response as { message?: string })?.message ??
          `分片 ${chunkIndex} 上传失败`
      );
    }
  };

  /** 顺序消费分片队列，失败分片重新入队重试 */
  const processQueue = async () => {
    if (processing) return;
    processing = true;
    while (chunkQueue.length > 0 && !isPaused.value) {
      const chunkIndex = chunkQueue.shift()!;
      try {
        await uploadChunk(chunkIndex);
      } catch (err) {
        if ((err as Error).name === "CanceledError") break;
        chunkQueue.unshift(chunkIndex);
        await new Promise(r => setTimeout(r, 1000));
      }
      if (chunkQueue.length > 0) {
        await new Promise(r => setTimeout(r, 50));
      }
    }
    processing = false;
    // 全部分片上传完毕后，由服务端合并，前端轮询状态
    if (completedChunks >= totalChunks && !isMerged.value) {
      startStatusCheck();
    }
  };

  /** 轮询 GET /api/Flie/status/{fileIdentifier}，直到 isMerged 或超时 */
  const startStatusCheck = () => {
    clearStatusCheck();
    statusCheckStart = Date.now();
    isMerging.value = true;
    statusCheckTimer = setInterval(async () => {
      if (isMerged.value) {
        clearStatusCheck();
        return;
      }
      if (Date.now() - statusCheckStart > STATUS_CHECK_TIMEOUT) {
        clearStatusCheck();
        uploading.value = false;
        isMerging.value = false;
        ElMessage.error("文件合并超时，请检查后端状态");
        return;
      }
      try {
        const status = await getChunkUploadStatus(fileIdentifier);
        completedChunks = status.uploadedChunks ?? completedChunks;
        totalChunks = status.totalChunks ?? totalChunks;
        if (status.uploadProgress !== undefined) {
          uploadPercentage.value = Math.floor(status.uploadProgress);
        } else {
          updateProgress();
        }
        if (status.isMerging) {
          isMerging.value = true;
          uploading.value = false;
        }
        // 兼容后端字段拼写 isMarged
        const merged = status.isMerged ?? status.isMarged;
        if (merged) {
          isMerged.value = true;
          isMerging.value = false;
          uploading.value = false;
          uploadStatus.value = "success";
          mergedFileName.value =
            status.fileName ?? selectedFile.value?.name ?? "";
          mergedFileSize.value = selectedFile.value?.size ?? 0;
          fileUrl.value =
            status.fileUrl ?? `/api/Flie/download/${fileIdentifier}`;
          uploadTime.value = new Date();
          clearStatusCheck();
          ElMessage.success("文件上传成功");
        }
      } catch {
        /* 单次轮询失败不中断，等待下次 */
      }
    }, STATUS_CHECK_INTERVAL);
  };

  const selectFile = (file: File): boolean => {
    const err = validateFile(file);
    if (err) {
      ElMessage.error(err);
      return false;
    }
    selectedFile.value = file;
    resetState();
    return true;
  };

  const startUpload = async () => {
    const file = selectedFile.value;
    const meta = getMeta();
    if (!file || uploading.value) return;
    if (!meta.ver_name || !meta.version) {
      ElMessage.warning("请先填写软件名称和版本号");
      return;
    }

    controller = new AbortController();
    uploading.value = true;
    isPaused.value = false;
    isMerged.value = false;
    isMerging.value = false;
    uploadStatus.value = "";
    startTime = Date.now();
    fileIdentifier = generateFileIdentifier(file);
    totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    completedChunks = 0;
    chunkQueue = Array.from({ length: totalChunks }, (_, i) => i);
    updateProgress();
    await processQueue();
  };

  const pauseUpload = () => {
    if (!uploading.value) return;
    isPaused.value = true;
    ElMessage.info("上传已暂停");
  };

  const resumeUpload = () => {
    if (!isPaused.value) return;
    isPaused.value = false;
    processQueue();
    ElMessage.info("上传已恢复");
  };

  const handleReupload = () => {
    ElMessageBox.confirm(
      "确定要重新上传文件吗？这将清除当前已选择的文件。",
      "确认重新上传",
      { confirmButtonText: "确定", cancelButtonText: "取消", type: "warning" }
    )
      .then(() => {
        selectedFile.value = null;
        resetState();
        ElMessage.success("已清除，请重新选择文件");
      })
      .catch(() => {});
  };

  onUnmounted(resetState);

  return {
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
    fileUrl,
    uploadTime,
    selectFile,
    startUpload,
    pauseUpload,
    resumeUpload,
    handleReupload,
    resetState,
    formatFileSize
  };
}
