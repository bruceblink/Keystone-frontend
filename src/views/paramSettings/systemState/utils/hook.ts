import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  onActivated,
  onDeactivated,
  type Ref
} from "vue";
import { ElMessage } from "element-plus";
import {
  getSystemStatusQuery,
  type SystemStatusItemDTO
} from "@/api/paramSettings/systemState";
import { replaceModuleData } from "./mappingUtils";
import type {
  DialogTable,
  FieldLabels,
  MainModuleGroup,
  ModuleMessage
} from "./types";
import {
  DEFAULT_DIALOG_LABELS,
  formatTraffic,
  getExt1Class,
  getTrafficUnit
} from "./dict";

const normalizeMessage = (raw: SystemStatusItemDTO): ModuleMessage => {
  const mapped = replaceModuleData(raw) as ModuleMessage;
  mapped.createTime = String(raw.createTime ?? raw.create_time ?? "");
  return mapped;
};

export function useSystemState(boatId: Ref<string>) {
  const loading = ref(false);
  const messages = ref<ModuleMessage[]>([]);
  const todayTraffic = ref(0);

  const detailVisible = ref(false);
  const currentGroup = ref<MainModuleGroup | null>(null);
  const dialogLabels = ref<FieldLabels>({ ...DEFAULT_DIALOG_LABELS });

  const onlineCount = computed(() => {
    return new Set(messages.value.map(m => m.mainModule)).size;
  });

  const warningCount = computed(() => messages.value.length);

  const todayTrafficText = computed(() => formatTraffic(todayTraffic.value));
  const todayTrafficUnit = computed(() => getTrafficUnit(todayTraffic.value));

  const groupedMainModules = computed<MainModuleGroup[]>(() => {
    const map = new Map<string, ModuleMessage[]>();
    for (const item of messages.value) {
      const key = item.mainModule || "未知模块";
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return Array.from(map.entries()).map(([mainModule, items]) => {
      let hasDanger = false;
      for (const row of items) {
        if (getExt1Class(row.ext1) === "is-danger") hasDanger = true;
      }
      const abnormal = hasDanger;
      return {
        mainModule,
        items,
        statusText: abnormal ? "异常" : "正常",
        statusClass: abnormal ? "is-danger" : "is-success"
      } as MainModuleGroup;
    });
  });

  const okCount = computed(
    () =>
      groupedMainModules.value.filter(g => g.statusClass === "is-success")
        .length
  );
  const errCount = computed(
    () =>
      groupedMainModules.value.filter(g => g.statusClass !== "is-success")
        .length
  );

  const dialogTables = computed<DialogTable[]>(() => {
    if (!currentGroup.value?.items.length) return [];
    const map = new Map<string, DialogTable>();
    for (const item of currentGroup.value.items) {
      const labels = item.fieldLabels ?? {};
      const key = [
        labels.subModule,
        labels.ext1,
        labels.ext2,
        labels.ext3,
        labels.ext4,
        labels.ext5
      ].join("|");
      const existing = map.get(key);
      if (existing) {
        existing.items.push(item);
      } else {
        map.set(key, { labels: { ...labels }, items: [item] });
      }
    }
    return Array.from(map.values());
  });

  const fetchStatusList = async () => {
    const id = boatId.value;
    if (!id) {
      messages.value = [];
      return;
    }
    loading.value = true;
    try {
      const res = await getSystemStatusQuery(id);
      const list = Array.isArray(res.data) ? res.data : [];
      messages.value = list.map(normalizeMessage);
      const trafficRaw = (res as { traffic?: number }).traffic;
      if (typeof trafficRaw === "number") {
        todayTraffic.value = trafficRaw;
      }
    } catch (err) {
      console.error("[systemState] 查询失败:", err);
      messages.value = [];
      ElMessage.error("查询系统状态失败");
    } finally {
      loading.value = false;
    }
  };

  const refreshStatus = async () => {
    if (!boatId.value) {
      ElMessage.warning("请先选择船只");
      return;
    }
    const prev = messages.value.length;
    await fetchStatusList();
    const diff = messages.value.length - prev;
    ElMessage.success(diff > 0 ? `刷新成功，新增 ${diff} 条数据` : "刷新成功");
  };

  const viewDetail = (group: MainModuleGroup) => {
    currentGroup.value = group;
    const first = group.items[0];
    if (first?.fieldLabels) {
      dialogLabels.value = {
        subModule:
          first.fieldLabels.subModule || DEFAULT_DIALOG_LABELS.subModule,
        ext1: first.fieldLabels.ext1 || DEFAULT_DIALOG_LABELS.ext1,
        ext2: first.fieldLabels.ext2 || DEFAULT_DIALOG_LABELS.ext2,
        ext3: first.fieldLabels.ext3 || DEFAULT_DIALOG_LABELS.ext3,
        ext4: first.fieldLabels.ext4 || DEFAULT_DIALOG_LABELS.ext4,
        ext5: first.fieldLabels.ext5 || DEFAULT_DIALOG_LABELS.ext5
      };
    } else {
      dialogLabels.value = { ...DEFAULT_DIALOG_LABELS };
    }
    detailVisible.value = true;
  };

  let stopBoatWatch: (() => void) | null = null;

  function startBoatWatch() {
    stopBoatWatch?.();
    stopBoatWatch = watch(
      boatId,
      id => {
        detailVisible.value = false;
        currentGroup.value = null;
        if (id) fetchStatusList();
        else messages.value = [];
      },
      { immediate: false }
    );
  }

  onMounted(() => {
    startBoatWatch();
    if (boatId.value) fetchStatusList();
  });

  onActivated(() => {
    startBoatWatch();
    if (boatId.value) fetchStatusList();
  });

  onDeactivated(() => {
    stopBoatWatch?.();
    stopBoatWatch = null;
  });

  onBeforeUnmount(() => {
    stopBoatWatch?.();
  });

  return {
    loading,
    messages,
    groupedMainModules,
    onlineCount,
    warningCount,
    todayTrafficText,
    todayTrafficUnit,
    okCount,
    errCount,
    detailVisible,
    currentGroup,
    dialogLabels,
    dialogTables,
    refreshStatus,
    viewDetail,
    getExt1Class,
    DEFAULT_DIALOG_LABELS
  };
}
