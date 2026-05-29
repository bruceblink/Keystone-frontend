/**
 * 版本发布页业务逻辑
 *
 * useVersionList — 版本列表 CRUD，供 VersionList 与页面 index 调用
 * useChunkUpload — 分片上传，由 PublishForm 使用（见 useChunkUpload.ts）
 *
 * 接口：
 * - GET    /device/version/query   列表
 * - POST   /device/version/add     发布（需先完成分片上传拿到 fileUrl）
 * - POST   /device/version/update  编辑
 * - DELETE /device/version/delete  删除
 */
import { ref, reactive, computed, onMounted } from "vue";
import { ElMessage, ElMessageBox, type FormRules } from "element-plus";
import type { VersionItem, VersionForm } from "./types";
import {
  addDeviceVersion,
  deleteDeviceVersion,
  getDeviceVersionQuery,
  updateDeviceVersion,
  type DeviceVersionItemDTO,
  type DeviceVersionSaveDTO
} from "@/api/boatDevice/version";
import { formatDateTime } from "./dict";

export { useChunkUpload } from "./useChunkUpload";
export type { ChunkUploadMeta } from "./useChunkUpload";

/** 将接口 DTO 转为页面 VersionItem，兼容多种字段命名 */
const normalizeVersion = (item: DeviceVersionItemDTO): VersionItem => ({
  uuid: String(item.uuid ?? ""),
  ver_name: String(item.ver_name ?? ""),
  version: String(item.version ?? ""),
  ver_des: String(item.ver_des ?? ""),
  client_path: String(item.client_path ?? item.path ?? ""),
  fileUrl: String(item.fileUrl ?? item.url ?? item.server_url ?? ""),
  md5: String(item.md5 ?? ""),
  size: String(item.size ?? ""),
  filename: String(item.filename ?? ""),
  create_time: String(item.create_time ?? "")
});

/** 比较版本号时忽略前缀 v */
const normVersion = (v: string) => (v.startsWith("v") ? v.slice(1) : v);

export function useVersionList() {
  const versionList = ref<VersionItem[]>([]);
  const searchQuery = ref("");
  const refreshing = ref(false);
  const listLoading = ref(false);
  const deletingUuid = ref<string | null>(null);

  /** 本地搜索 + 按发布时间倒序 */
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

  /** GET /device/version/query — 拉取全部版本 */
  const fetchVersionList = async () => {
    listLoading.value = true;
    try {
      const res = await getDeviceVersionQuery();
      versionList.value = (res.data ?? []).map(normalizeVersion);
    } catch (err) {
      console.error("[version] /device/version/query 失败:", err);
      ElMessage.error("版本列表加载失败");
      versionList.value = [];
    } finally {
      listLoading.value = false;
    }
  };

  const handleRefreshList = async () => {
    refreshing.value = true;
    searchQuery.value = "";
    await fetchVersionList();
    refreshing.value = false;
    ElMessage.success("已刷新");
  };

  /** DELETE /device/version/delete */
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
      .then(async () => {
        deletingUuid.value = version.uuid;
        try {
          await deleteDeviceVersion(version.uuid);
          ElMessage.success("版本删除成功");
          await fetchVersionList();
        } catch (err) {
          console.error("[version] /device/version/delete 失败:", err);
          ElMessage.error("版本删除失败");
        } finally {
          deletingUuid.value = null;
        }
      })
      .catch(() => {});
  };

  // ----- 编辑弹窗 -----
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

  /** POST /device/version/update */
  const submitEdit = async () => {
    publishing.value = true;
    try {
      const payload: DeviceVersionSaveDTO = {
        uuid: editForm.uuid!,
        version: editForm.version,
        md5: editForm.md5,
        filename: editForm.filename,
        ver_name: editForm.ver_name,
        ver_des: editForm.ver_des,
        server_url: editForm.fileUrl,
        client_path: editForm.client_path,
        create_time: editForm.create_time,
        size: editForm.size,
        fileUrl: editForm.fileUrl
      };
      await updateDeviceVersion(payload);
      editVisible.value = false;
      ElMessage.success("版本修改成功");
      await fetchVersionList();
    } catch (err) {
      console.error("[version] /device/version/update 失败:", err);
      ElMessage.error("版本修改失败");
    } finally {
      publishing.value = false;
    }
  };

  /**
   * POST /device/version/add
   * @returns false 表示同软件同版本号已存在；true 发布成功
   */
  const publishVersion = async (payload: {
    ver_name: string;
    version: string;
    ver_des: string;
    client_path: string;
    filename: string;
    fileSize: number;
    fileUrl: string;
    md5?: string;
  }) => {
    const dup = versionList.value.some(
      item =>
        item.ver_name === payload.ver_name &&
        normVersion(item.version) === normVersion(payload.version)
    );
    if (dup) return false;

    const body: DeviceVersionSaveDTO = {
      uuid: "",
      ver_name: payload.ver_name,
      version: payload.version,
      ver_des: payload.ver_des,
      client_path: payload.client_path,
      filename: payload.filename,
      md5: payload.md5 ?? "",
      server_url: payload.fileUrl,
      fileUrl: payload.fileUrl,
      size: Math.max(0.01, payload.fileSize / 1024 / 1024).toFixed(2),
      create_time: formatDateTime(new Date())
    };
    await addDeviceVersion(body);
    await fetchVersionList();
    return true;
  };

  onMounted(() => {
    fetchVersionList();
  });

  return {
    versionList,
    searchQuery,
    refreshing,
    listLoading,
    deletingUuid,
    filteredVersionList,
    fetchVersionList,
    handleRefreshList,
    handleDeleteVersion,
    editVisible,
    publishing,
    editForm,
    editRules,
    handleEditVersion,
    submitEdit,
    publishVersion
  };
}
