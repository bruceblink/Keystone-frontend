import { ref, reactive, computed } from "vue";
import { ElMessage, ElMessageBox, type FormRules } from "element-plus";
import type { VersionItem, VersionForm } from "./types";
import { formatDateTime, genUuid, formatFileSize, MOCK_VERSIONS } from "./dict";

export function useVersionList() {
  // ===== 版本列表 =====
  const versionList = ref<VersionItem[]>(MOCK_VERSIONS.map(r => ({ ...r })));
  const searchQuery = ref("");
  const refreshing = ref(false);
  const deletingUuid = ref<string | null>(null);

  const filteredVersionList = computed(() => {
    let list = [...versionList.value];
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase();
      list = list.filter(
        item =>
          item.ver_name?.toLowerCase().includes(q) ||
          item.version?.toLowerCase().includes(q) ||
          item.client_path?.toLowerCase().includes(q) ||
          item.ver_des?.toLowerCase().includes(q)
      );
    }
    return list.sort(
      (a, b) =>
        new Date(b.create_time || 0).getTime() -
        new Date(a.create_time || 0).getTime()
    );
  });

  const handleRefreshList = async () => {
    refreshing.value = true;
    await new Promise(r => setTimeout(r, 400));
    versionList.value = MOCK_VERSIONS.map(r => ({ ...r }));
    searchQuery.value = "";
    refreshing.value = false;
    ElMessage.success("已刷新");
  };

  const handleDeleteVersion = (version: VersionItem) => {
    ElMessageBox.confirm(
      `确定要删除版本「${version.ver_name} ${version.version}」吗？此操作不可逆。`,
      "确认删除",
      {
        confirmButtonText: "确定删除",
        cancelButtonText: "取消",
        type: "warning"
      }
    )
      .then(() => {
        deletingUuid.value = version.uuid;
        versionList.value = versionList.value.filter(
          item => item.uuid !== version.uuid
        );
        deletingUuid.value = null;
        ElMessage.success("版本删除成功");
      })
      .catch(() => {});
  };

  // ===== 编辑弹窗 =====
  const editVisible = ref(false);
  const publishing = ref(false);
  const editForm = reactive<VersionForm>({
    uuid: "",
    ver_name: "",
    version: "",
    ver_des: "",
    client_path: "",
    fileUrl: "",
    md5: "",
    size: "",
    filename: "",
    create_time: ""
  });

  const editRules: FormRules = {
    ver_name: [
      { required: true, message: "请输入软件名称", trigger: "blur" },
      { min: 2, max: 50, message: "长度在 2-50 个字符", trigger: "blur" }
    ],
    version: [{ required: true, message: "请输入版本号", trigger: "blur" }],
    ver_des: [{ required: true, message: "请输入发布说明", trigger: "blur" }],
    client_path: [
      { required: true, message: "请输入存储路径", trigger: "blur" }
    ]
  };

  const handleEditVersion = (version: VersionItem) => {
    Object.assign(editForm, { ...version });
    editVisible.value = true;
  };

  const submitEdit = () => {
    const idx = versionList.value.findIndex(
      item => item.uuid === editForm.uuid
    );
    if (idx !== -1) {
      Object.assign(versionList.value[idx], {
        ver_name: editForm.ver_name,
        version: editForm.version,
        ver_des: editForm.ver_des,
        client_path: editForm.client_path
      });
    }
    editVisible.value = false;
    ElMessage.success("版本修改成功");
  };

  // ===== 发布 =====
  const addToList = (form: VersionForm, filename: string, size: number) => {
    versionList.value.unshift({
      uuid: genUuid(),
      ver_name: form.ver_name,
      version: form.version,
      ver_des: form.ver_des,
      client_path: form.client_path,
      fileUrl: form.fileUrl,
      md5: form.md5,
      size: (size / 1024 / 1024).toFixed(2),
      filename,
      create_time: formatDateTime(new Date())
    });
  };

  return {
    versionList,
    searchQuery,
    refreshing,
    deletingUuid,
    filteredVersionList,
    handleRefreshList,
    handleDeleteVersion,
    editVisible,
    publishing,
    editForm,
    editRules,
    handleEditVersion,
    submitEdit,
    addToList
  };
}

// ===== 文件上传（模拟） =====
export function useFileUpload() {
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
  const uploadTime = ref<Date | null>(null);

  let uploadTimer: ReturnType<typeof setInterval> | null = null;

  const VALID_TYPES = /\.(zip|tar|gz|exe|bin)$/i;
  const MAX_SIZE_GB = 1;

  const validateFile = (file: File): string | null => {
    if (!VALID_TYPES.test(file.name))
      return "只能上传 .zip .tar .gz .exe .bin 格式的文件";
    if (file.size / 1024 / 1024 / 1024 > MAX_SIZE_GB)
      return "文件大小不能超过 1GB";
    return null;
  };

  const resetState = () => {
    if (uploadTimer) {
      clearInterval(uploadTimer);
      uploadTimer = null;
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
    uploadTime.value = null;
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

  const startUpload = () => {
    if (!selectedFile.value || uploading.value) return;
    uploading.value = true;
    isPaused.value = false;

    uploadTimer = setInterval(() => {
      if (isPaused.value) return;
      const speed = ((selectedFile.value!.size / 1024 / 1024) * 0.12).toFixed(
        2
      );
      uploadSpeed.value = speed;

      const increment = 2 + Math.random() * 3;
      uploadPercentage.value = Math.min(
        100,
        uploadPercentage.value + increment
      );

      const remaining = 100 - uploadPercentage.value;
      timeLeft.value = Math.max(
        0,
        Math.round(remaining / (parseFloat(speed) || 1))
      );

      if (uploadPercentage.value >= 100) {
        clearInterval(uploadTimer!);
        uploadTimer = null;
        uploading.value = false;
        isMerging.value = true;
        uploadStatus.value = "success";

        setTimeout(() => {
          isMerging.value = false;
          isMerged.value = true;
          mergedFileName.value = selectedFile.value!.name;
          mergedFileSize.value = selectedFile.value!.size;
          uploadTime.value = new Date();
          ElMessage.success("文件上传成功");
        }, 800);
      }
    }, 200);
  };

  const pauseUpload = () => {
    if (!uploading.value) return;
    isPaused.value = true;
    ElMessage.info("上传已暂停");
  };

  const resumeUpload = () => {
    if (!isPaused.value) return;
    isPaused.value = false;
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
