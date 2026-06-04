import {
  ref,
  computed,
  reactive,
  watch,
  onMounted,
  onBeforeUnmount,
  onActivated,
  onDeactivated,
  nextTick,
  type Ref
} from "vue";
import {
  ElMessage,
  ElMessageBox,
  type FormInstance,
  type FormRules
} from "element-plus";
import {
  buildAlarmReasonMap,
  deleteAlarmRecord,
  getAlarmReasonDictQuery,
  getWaterRegionDictQuery,
  normalizeAlarmReasonOptions,
  normalizeComboxRegionMap,
  postAlarmRecordList,
  type AlarmRecordItemDTO,
  type ComboxRegionItemDTO
} from "@/api/paramSettings/alarmRecord";
import type { AlarmRecordItem, AlarmSearchForm, MediaItem } from "./types";
import { ALARM_STATE_MAP, getDutyLevelText } from "./dict";

const normalizeRecord = (item: AlarmRecordItemDTO): AlarmRecordItem => ({
  sid: String(item.sid ?? ""),
  camid: item.camid ?? "",
  alarmtype: String(item.alarmtype ?? ""),
  stime: item.stime ?? "",
  state: Number(item.state ?? 0),
  address: item.address ?? "",
  speed: item.speed ?? "",
  level: item.level ?? "",
  region: item.region ?? "",
  lng: item.lng ?? "",
  lat: item.lat ?? "",
  picurl1: item.picurl1 ?? "",
  picurl2: item.picurl2 ?? "",
  picurl3: item.picurl3 ?? "",
  picurl4: item.picurl4 ?? "",
  videourl: item.videourl ?? ""
});

const buildMediaList = (row: AlarmRecordItem): MediaItem[] =>
  [row.picurl1, row.picurl2, row.picurl3, row.picurl4]
    .filter(url => url && url !== "")
    .map(url => ({ url, type: "img" as const }));

export function useAlarmRecord(boatId: Ref<string>) {
  const searchFormRef = ref<FormInstance>();
  const searchForm = reactive<AlarmSearchForm>({
    alarmType: [],
    startTime: "",
    endTime: "",
    status: -1
  });

  /** 报警原因（device.reasonType） */
  const alarmTypeOptions = ref<{ value: string; label: string }[]>([]);
  const alarmTypeMap = ref<Record<string, string>>({});
  /** 水域类型（device.waterRegion） */
  const waterRegionMap = ref<Record<string, string>>({});

  const tableData = ref<AlarmRecordItem[]>([]);
  const loading = ref(false);
  const hasDataLoaded = ref(false);
  const listSearchQuery = ref("");
  const selectedRow = ref<AlarmRecordItem | null>(null);
  const mediaList = ref<MediaItem[]>([]);

  const pagination = reactive({
    currentPage: 1,
    pageSize: 20,
    total: 0
  });

  const showImagePreview = ref(false);
  const previewImageUrl = ref("");
  const currentImageIndex = ref(0);
  const imageList = ref<MediaItem[]>([]);

  const isAllAlarmTypeChecked = computed(
    () =>
      searchForm.alarmType.length === alarmTypeOptions.value.length &&
      alarmTypeOptions.value.length > 0
  );

  const isAlarmTypeIndeterminate = computed(
    () =>
      searchForm.alarmType.length > 0 &&
      searchForm.alarmType.length < alarmTypeOptions.value.length
  );

  const filteredTableData = computed(() => {
    let list = [...tableData.value];
    if (listSearchQuery.value) {
      const q = listSearchQuery.value.toLowerCase();
      list = list.filter(
        item =>
          String(alarmTypeMap.value[item.alarmtype] || "")
            .toLowerCase()
            .includes(q) ||
          String(item.camid || "")
            .toLowerCase()
            .includes(q) ||
          String(item.address || "")
            .toLowerCase()
            .includes(q) ||
          String(waterRegionMap.value[String(item.region)] || "")
            .toLowerCase()
            .includes(q)
      );
    }
    return list.sort(
      (a, b) =>
        new Date(b.stime || 0).getTime() - new Date(a.stime || 0).getTime()
    );
  });

  const dataList = computed(() => {
    pagination.total = filteredTableData.value.length;
    const start = (pagination.currentPage - 1) * pagination.pageSize;
    return filteredTableData.value.slice(start, start + pagination.pageSize);
  });

  const shouldShowEmpty = computed(
    () => hasDataLoaded.value && !loading.value && tableData.value.length === 0
  );

  const getWaterRegionName = (sort: string | number | null | undefined) => {
    if (sort == null || sort === "") return "—";
    return waterRegionMap.value[String(sort)] ?? String(sort);
  };

  /** GET /device/dictionaries/items — 报警原因 */
  const fetchAlarmReasonDict = async (devid: string) => {
    try {
      const res = await getAlarmReasonDictQuery(devid);
      const list = Array.isArray(res.data) ? res.data : [];
      alarmTypeOptions.value = normalizeAlarmReasonOptions(list);
      alarmTypeMap.value = buildAlarmReasonMap(list);
    } catch (err) {
      console.error("[alarmRecord] device.reasonType 查询失败:", err);
      alarmTypeOptions.value = [];
      alarmTypeMap.value = {};
    }
  };

  /** GET /device/dictionaries/items — 水域类型 */
  const fetchWaterRegionDict = async (devid: string) => {
    try {
      const res = await getWaterRegionDictQuery(devid);
      waterRegionMap.value = normalizeComboxRegionMap(
        res.data as ComboxRegionItemDTO[]
      );
    } catch (err) {
      console.error("[alarmRecord] device.waterRegion 查询失败:", err);
      waterRegionMap.value = {};
    }
  };

  /** POST /bp/alarm/data/list — 报警记录 */
  const fetchAlarmList = async (form?: Partial<AlarmSearchForm>, sync = "") => {
    const id = boatId.value;
    if (!id) {
      tableData.value = [];
      hasDataLoaded.value = true;
      return;
    }
    loading.value = true;
    try {
      const res = await postAlarmRecordList({
        starttime: form?.startTime ?? searchForm.startTime,
        endtime: form?.endTime ?? searchForm.endTime,
        status: form?.status ?? searchForm.status,
        alarmtype: form?.alarmType ?? searchForm.alarmType,
        sync,
        devid: id
      });
      tableData.value = (res.data ?? []).map(normalizeRecord);
      hasDataLoaded.value = true;
      pagination.currentPage = 1;
      if (selectedRow.value) {
        const still = tableData.value.find(
          r => r.sid === selectedRow.value?.sid
        );
        if (!still) {
          selectedRow.value = null;
          mediaList.value = [];
        }
      }
    } catch (err) {
      console.error("[alarmRecord] 查询报警列表失败:", err);
      tableData.value = [];
      hasDataLoaded.value = true;
      ElMessage.error("查询报警记录失败");
    } finally {
      loading.value = false;
    }
  };

  const clearDetail = () => {
    selectedRow.value = null;
    mediaList.value = [];
  };

  const handleCheckAllAlarmType = (checked: boolean) => {
    searchForm.alarmType = checked
      ? alarmTypeOptions.value.map(o => o.value)
      : [];
  };

  const handleRowClick = (row: AlarmRecordItem) => {
    selectedRow.value = row;
    mediaList.value = buildMediaList(row);
  };

  const handleDelete = (row: AlarmRecordItem) => {
    ElMessageBox.confirm("确定要删除该条报警信息吗？", "提示", {
      type: "warning",
      confirmButtonText: "确定",
      cancelButtonText: "取消"
    })
      .then(async () => {
        try {
          await deleteAlarmRecord(row.sid);
          ElMessage.success("删除成功");
          clearDetail();
          const sync = !searchForm.startTime || !searchForm.endTime ? "" : "-1";
          await fetchAlarmList(undefined, sync);
        } catch (err) {
          console.error("[alarmRecord] 删除失败:", err);
          ElMessage.error("删除失败");
        }
      })
      .catch(() => {});
  };

  const disabledStartDate = (time: Date) => {
    if (!searchForm.endTime) return false;
    return time.getTime() > new Date(searchForm.endTime).getTime();
  };

  const disabledEndDate = (time: Date) => {
    if (!searchForm.startTime) return false;
    return time.getTime() < new Date(searchForm.startTime).getTime();
  };

  const rules: FormRules = {
    startTime: [
      {
        validator: (_r, value, callback) => {
          if (searchForm.status !== -1 && !value) {
            callback(new Error("请选择开始时间"));
            return;
          }
          callback();
        },
        trigger: "change"
      }
    ],
    endTime: [
      {
        validator: (_r, value, callback) => {
          if (searchForm.status !== -1 && !value) {
            callback(new Error("请选择结束时间"));
            return;
          }
          callback();
        },
        trigger: "change"
      }
    ]
  };

  watch(
    () => searchForm.status,
    val => {
      if (val !== -1) {
        nextTick(() => {
          searchFormRef.value?.validateField(["startTime", "endTime"]);
        });
      }
    }
  );

  const handleSearch = () => {
    if (!boatId.value) {
      ElMessage.warning("请先选择船只");
      return;
    }
    searchFormRef.value?.validate(valid => {
      if (!valid) {
        ElMessage.warning("请填写必填项");
        return;
      }
      if (!searchForm.startTime || !searchForm.endTime) {
        ElMessage.warning("请选择开始时间与结束时间");
        return;
      }
      const sync = "-1";
      clearDetail();
      fetchAlarmList(undefined, sync);
    });
  };

  const resetForm = () => {
    if (!boatId.value) {
      ElMessage.warning("请先选择船只");
      return;
    }
    searchFormRef.value?.resetFields();
    searchForm.alarmType = [];
    searchForm.startTime = "";
    searchForm.endTime = "";
    searchForm.status = -1;
    listSearchQuery.value = "";
    clearDetail();
    fetchAlarmList();
  };

  const openImagePreview = (url: string, index: number) => {
    imageList.value = mediaList.value.filter(m => m.type === "img");
    currentImageIndex.value = index;
    previewImageUrl.value = url;
    showImagePreview.value = true;
    document.body.style.overflow = "hidden";
  };

  const closeImagePreview = () => {
    showImagePreview.value = false;
    previewImageUrl.value = "";
    currentImageIndex.value = 0;
    imageList.value = [];
    document.body.style.overflow = "";
  };

  const prevImage = () => {
    if (!imageList.value.length) return;
    currentImageIndex.value =
      currentImageIndex.value > 0
        ? currentImageIndex.value - 1
        : imageList.value.length - 1;
    previewImageUrl.value = imageList.value[currentImageIndex.value].url;
  };

  const nextImage = () => {
    if (!imageList.value.length) return;
    currentImageIndex.value =
      currentImageIndex.value < imageList.value.length - 1
        ? currentImageIndex.value + 1
        : 0;
    previewImageUrl.value = imageList.value[currentImageIndex.value].url;
  };

  const onPreviewKeydown = (e: KeyboardEvent) => {
    if (!showImagePreview.value) return;
    if (e.key === "Escape") closeImagePreview();
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      prevImage();
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      nextImage();
    }
  };

  let stopBoatWatch: (() => void) | null = null;

  const loadBoatContext = async (devid: string) => {
    await Promise.all([
      fetchAlarmReasonDict(devid),
      fetchWaterRegionDict(devid),
      fetchAlarmList()
    ]);
  };

  function startBoatWatch() {
    stopBoatWatch?.();
    stopBoatWatch = watch(
      boatId,
      id => {
        clearDetail();
        listSearchQuery.value = "";
        pagination.currentPage = 1;
        if (id) {
          loadBoatContext(id);
        } else {
          tableData.value = [];
          alarmTypeOptions.value = [];
          alarmTypeMap.value = {};
          waterRegionMap.value = {};
          hasDataLoaded.value = false;
        }
      },
      { immediate: false }
    );
  }

  onMounted(() => {
    startBoatWatch();
    document.addEventListener("keydown", onPreviewKeydown);
    if (boatId.value) loadBoatContext(boatId.value);
  });

  onActivated(() => {
    startBoatWatch();
    if (boatId.value) loadBoatContext(boatId.value);
  });

  onDeactivated(() => {
    stopBoatWatch?.();
    stopBoatWatch = null;
  });

  onBeforeUnmount(() => {
    stopBoatWatch?.();
    document.removeEventListener("keydown", onPreviewKeydown);
    document.body.style.overflow = "";
  });

  return {
    searchFormRef,
    searchForm,
    rules,
    alarmTypeOptions,
    alarmTypeMap,
    isAllAlarmTypeChecked,
    isAlarmTypeIndeterminate,
    handleCheckAllAlarmType,
    disabledStartDate,
    disabledEndDate,
    handleSearch,
    resetForm,
    listSearchQuery,
    loading,
    dataList,
    filteredTableData,
    pagination,
    shouldShowEmpty,
    selectedRow,
    mediaList,
    handleRowClick,
    handleDelete,
    waterRegionMap,
    getWaterRegionName,
    getDutyLevelText,
    ALARM_STATE_MAP,
    showImagePreview,
    previewImageUrl,
    currentImageIndex,
    imageList,
    openImagePreview,
    closeImagePreview,
    prevImage,
    nextImage
  };
}
