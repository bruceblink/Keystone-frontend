import {
  ref,
  computed,
  reactive,
  watch,
  onMounted,
  onBeforeUnmount,
  onActivated,
  onDeactivated,
  type Ref
} from "vue";
import type { AlarmConfigTypeItem, AlarmConfigRecord } from "./types";
import { MOCK_ALARM_CONFIG_TYPES, getBoatAlarmConfigs } from "./dict";

export function useAlarmConfigList(boatId: Ref<string>) {
  // 无船只时返回空列表；有船只时按船只加载对应报警类型
  // 实际项目中应通过 API 按 boatId 获取该船支持的报警类型
  const alarmTypes = computed<AlarmConfigTypeItem[]>(() => {
    if (!boatId.value) return [];
    return MOCK_ALARM_CONFIG_TYPES.filter(t => t.visibility === "1").map(t => ({
      ...t
    }));
  });
  const alarmConfigs = ref<AlarmConfigRecord[]>([]);

  const loadConfigs = () => {
    alarmConfigs.value = boatId.value ? getBoatAlarmConfigs(boatId.value) : [];
  };

  let stopWatch: (() => void) | null = null;
  const startWatch = () => {
    stopWatch?.();
    stopWatch = watch(boatId, loadConfigs, { immediate: false });
  };

  onMounted(() => {
    loadConfigs();
    startWatch();
  });
  onBeforeUnmount(() => {
    stopWatch?.();
    stopWatch = null;
  });
  onActivated(() => {
    loadConfigs();
    startWatch();
  });
  onDeactivated(() => {
    stopWatch?.();
    stopWatch = null;
  });

  // ===== 搜索 =====
  const searchQuery = ref("");

  const filteredTypes = computed(() => {
    const q = searchQuery.value.toLowerCase().trim();
    if (!q) return alarmTypes.value;
    return alarmTypes.value.filter(
      t => t.des.toLowerCase().includes(q) || t.id.toLowerCase().includes(q)
    );
  });

  const onSearch = () => {
    pagination.currentPage = 1;
  };

  // ===== 分页 =====
  const pagination = reactive({
    currentPage: 1,
    pageSize: 25,
    total: 0,
    background: true
  });

  const isConfigured = (alarmTypeId: string) =>
    alarmConfigs.value.some(c => String(c.alarmtype) === String(alarmTypeId));

  const dataList = computed(() => {
    pagination.total = filteredTypes.value.length;
    const start = (pagination.currentPage - 1) * pagination.pageSize;
    return filteredTypes.value
      .slice(start, start + pagination.pageSize)
      .map(item => ({ ...item, configured: isConfigured(item.id) }));
  });

  const configuredCount = computed(
    () => alarmTypes.value.filter(t => isConfigured(t.id)).length
  );
  const unconfiguredCount = computed(
    () => alarmTypes.value.length - configuredCount.value
  );

  // ===== 详情导航 =====
  const showDetail = ref(false);
  const currentAlarmType = ref<AlarmConfigTypeItem | null>(null);

  const handleViewDetail = (
    item: AlarmConfigTypeItem & { configured?: boolean }
  ) => {
    currentAlarmType.value = JSON.parse(JSON.stringify(item));
    showDetail.value = true;
  };

  const handleBack = () => {
    showDetail.value = false;
    loadConfigs();
    currentAlarmType.value = null;
  };

  // ===== 列定义 =====
  const columns: TableColumnList = [
    { label: "序号", type: "index", width: 70 },
    {
      label: "报警类型名称",
      prop: "des",
      minWidth: 180,
      showOverflowTooltip: true
    },
    { label: "编号", prop: "id", width: 100 },
    { label: "配置状态", prop: "configured", width: 130, slot: "configured" },
    { label: "操作", fixed: "right", width: 120, slot: "operation" }
  ];

  return {
    searchQuery,
    onSearch,
    dataList,
    filteredTypes,
    pagination,
    configuredCount,
    unconfiguredCount,
    showDetail,
    currentAlarmType,
    handleViewDetail,
    handleBack,
    loadConfigs,
    alarmConfigs,
    columns
  };
}
