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
import { ElMessage } from "element-plus";
import type { AlarmConfigTypeItem, AlarmConfigRecord } from "./types";
import {
  getAlarmConditionList,
  getAlarmReasonTypeListQuery
} from "@/api/paramSettings/alarmConfig";
import type { ReasonTypeListItemDTO } from "@/api/paramSettings/alarmType";
import {
  formatConfigTime,
  normalizeAlarmConfigRecord,
  normalizeAlarmConfigType
} from "./dict";

/**
 * 报警规则配置列表页组合式逻辑
 * @param boatId 当前选中船只 devid，未选时不拉取报警原因
 */
export function useAlarmConfigList(boatId: Ref<string>) {
  const loading = ref(false);
  /** 报警原因列表（来自 reasontype/dict/query） */
  const alarmTypes = ref<AlarmConfigTypeItem[]>([]);
  const alarmConfigs = ref<AlarmConfigRecord[]>([]);

  /**
   * 拉取报警原因列表：GET /reasontype/dict/query?id=-1
   */
  const fetchAlarmTypes = async (devid?: string) => {
    const queryDevid = devid ?? boatId.value;
    if (!queryDevid) {
      alarmTypes.value = [];
      return;
    }
    try {
      const res = await getAlarmReasonTypeListQuery({
        id: "-1",
        devid: queryDevid
      });
      const raw = res.data;
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as { list?: unknown })?.list)
        ? (raw as { list: ReasonTypeListItemDTO[] }).list ?? []
        : [];
      // 接口返回全部展示；仅当 visibility 明确为 0 时隐藏
      alarmTypes.value = list
        .map(normalizeAlarmConfigType)
        .filter(t => t.visibility !== "0");
    } catch (err) {
      console.error("[alarmConfig] 查询报警原因列表失败:", err);
      alarmTypes.value = [];
      ElMessage.error("查询报警原因列表失败");
    }
  };

  /**
   * 拉取当前船只报警参数，用于判断「已配置」（需已选船只）
   */
  const fetchAlarmConfigs = async (devid?: string) => {
    const id = devid ?? boatId.value;
    if (!id) {
      alarmConfigs.value = [];
      return;
    }
    try {
      const res = await getAlarmConditionList(id, "-1");
      const list = Array.isArray(res.data) ? res.data : [];
      alarmConfigs.value = list.map(normalizeAlarmConfigRecord);
    } catch (err) {
      console.error("[alarmConfig] 查询报警参数列表失败:", err);
      alarmConfigs.value = [];
    }
  };

  /**
   * 已选船只时拉取报警原因与配置状态；未选时清空列表
   */
  const refreshAll = async (devid?: string) => {
    const id = devid ?? boatId.value;
    if (!id) {
      alarmTypes.value = [];
      alarmConfigs.value = [];
      pagination.currentPage = 1;
      return;
    }
    loading.value = true;
    try {
      await fetchAlarmTypes(id);
      await fetchAlarmConfigs(id);
      pagination.currentPage = 1;
    } finally {
      loading.value = false;
    }
  };

  let stopWatch: (() => void) | null = null;

  /**
   * 监听船只切换：重新按 devid 查报警原因并刷新配置状态
   */
  const startWatch = () => {
    stopWatch?.();
    stopWatch = watch(
      boatId,
      id => {
        refreshAll(id || undefined);
      },
      { immediate: false }
    );
  };

  onMounted(() => {
    startWatch();
    refreshAll();
  });
  onBeforeUnmount(() => {
    stopWatch?.();
    stopWatch = null;
  });
  onActivated(() => {
    startWatch();
    refreshAll();
  });
  onDeactivated(() => {
    stopWatch?.();
    stopWatch = null;
  });

  const searchQuery = ref("");

  /** 按关键字过滤报警原因名称/编号 */
  const filteredTypes = computed(() => {
    const q = searchQuery.value.toLowerCase().trim();
    if (!q) return alarmTypes.value;
    return alarmTypes.value.filter(
      t => t.des.toLowerCase().includes(q) || t.id.toLowerCase().includes(q)
    );
  });

  /** 搜索时重置到第一页 */
  const onSearch = () => {
    pagination.currentPage = 1;
  };

  const pagination = reactive({
    currentPage: 1,
    pageSize: 25,
    total: 0,
    background: true
  });

  /** 是否已选船只（未选时无法判断配置状态） */
  const hasBoat = computed(() => Boolean(boatId.value));

  /** 判断某报警原因是否已有参数配置 */
  const isConfigured = (alarmTypeId: string) => {
    if (!hasBoat.value) return false;
    return alarmConfigs.value.some(
      c => String(c.alarmtype) === String(alarmTypeId)
    );
  };

  watch(
    filteredTypes,
    list => {
      pagination.total = list.length;
      const maxPage = Math.max(1, Math.ceil(list.length / pagination.pageSize));
      if (pagination.currentPage > maxPage) pagination.currentPage = 1;
    },
    { immediate: true }
  );

  /** 当前页表格数据 */
  const dataList = computed(() => {
    const start = (pagination.currentPage - 1) * pagination.pageSize;
    return filteredTypes.value
      .slice(start, start + pagination.pageSize)
      .map(item => ({
        ...item,
        configured: isConfigured(item.id),
        configStatusText: hasBoat.value
          ? isConfigured(item.id)
            ? "已配置"
            : "未配置"
          : "—",
        displayTime: formatConfigTime(
          item.update_time ?? item.create_time ?? ""
        )
      }));
  });

  const totalCount = computed(() => alarmTypes.value.length);

  const configuredCount = computed(() => {
    if (!hasBoat.value) return 0;
    return alarmTypes.value.filter(t => isConfigured(t.id)).length;
  });
  const unconfiguredCount = computed(() => {
    if (!hasBoat.value) return totalCount.value;
    return totalCount.value - configuredCount.value;
  });

  const showDetail = ref(false);
  const currentAlarmType = ref<AlarmConfigTypeItem | null>(null);

  /** 打开报警原因详情配置页 */
  const handleViewDetail = (
    item: AlarmConfigTypeItem & { configured?: boolean }
  ) => {
    if (!boatId.value) {
      ElMessage.warning("请先选择船只，再配置报警参数");
      return;
    }
    currentAlarmType.value = JSON.parse(JSON.stringify(item));
    showDetail.value = true;
  };

  /** 返回列表并刷新配置状态 */
  const handleBack = () => {
    showDetail.value = false;
    currentAlarmType.value = null;
    refreshAll();
  };

  /** 清空搜索并刷新列表 */
  const handleRefresh = () => {
    searchQuery.value = "";
    refreshAll();
    ElMessage.success("已刷新");
  };

  const columns: TableColumnList = [
    { label: "序号", type: "index", width: 70 },
    {
      label: "报警原因",
      prop: "des",
      minWidth: 180,
      showOverflowTooltip: true
    },
    { label: "编号", prop: "id", width: 100 },
    { label: "配置状态", width: 130, slot: "configured" },
    { label: "更新时间", prop: "displayTime", width: 170 },
    { label: "操作", fixed: "right", width: 120, slot: "operation" }
  ];

  return {
    loading,
    searchQuery,
    onSearch,
    dataList,
    filteredTypes,
    pagination,
    totalCount,
    configuredCount,
    unconfiguredCount,
    hasBoat,
    showDetail,
    currentAlarmType,
    handleViewDetail,
    handleBack,
    handleRefresh,
    refreshAll,
    alarmConfigs,
    columns
  };
}
