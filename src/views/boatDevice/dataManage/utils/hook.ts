import { ref, shallowRef, computed, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { useBoatStoreHook } from "@/store/modules/boat";
import {
  dedupeAlarmTypeOptions,
  getDataManageAlarmTypeDict,
  getDataManageWaterRegionDict,
  getProjectFenceList,
  normalizeComboxRegionMap,
  postDeviceAlarmList,
  type DeviceAlarmItemDTO,
  type ComboxRegionItemDTO
} from "@/api/boatDevice/dataManage";
import type { AlarmRecord, AlarmType } from "./dict";
import type { FenceItem } from "./map";

export interface DataManageSearchForm {
  alarmType: number[];
  timeRange: string[];
  review: number;
  projectGroup: string;
}

function parseFencePoints(data: unknown): { lng: number; lat: number }[] {
  if (Array.isArray(data)) {
    return data
      .map(p => ({
        lng: Number((p as { lng?: number }).lng),
        lat: Number((p as { lat?: number }).lat)
      }))
      .filter(p => !Number.isNaN(p.lng) && !Number.isNaN(p.lat));
  }
  if (typeof data === "string" && data.trim()) {
    try {
      return parseFencePoints(JSON.parse(data));
    } catch {
      return [];
    }
  }
  return [];
}

const normalizeAlarm = (item: DeviceAlarmItemDTO): AlarmRecord => ({
  address: item.address ?? "",
  alarmtype: Number(item.alarmtype ?? item.reason ?? 0),
  camid: item.camid ?? "",
  create_time: item.create_time ?? null,
  devid: item.devid ?? "",
  dutylevel: Number(item.dutylevel ?? 0),
  ext1: String(item.ext1 ?? ""),
  ext2: String(item.ext2 ?? ""),
  lat: Number(item.lat ?? 0),
  level: Number(item.level ?? 0),
  lng: Number(item.lng ?? 0),
  picnum: Number(item.picnum ?? 0),
  picurl1: item.picurl1 ?? "",
  picurl2: item.picurl2 ?? "",
  picurl3: item.picurl3 ?? "",
  picurl4: item.picurl4 ?? "",
  reason: Number(item.reason ?? item.alarmtype ?? 0),
  region: Number(item.region ?? 0),
  shipstatus: Number(item.shipstatus ?? 0),
  sid: item.sid ?? "",
  speed: Number(item.speed ?? 0),
  state: Number(item.state ?? 0),
  stime: item.stime ?? "",
  sync: String(item.sync ?? ""),
  timetype: item.timetype ?? "",
  uuid: item.uuid ?? item.sid ?? "",
  videourl: item.videourl ?? "",
  review: Number(item.review ?? 0)
});

const normalizeFence = (item: {
  data?: unknown;
  name?: string;
  areatype?: string | number;
}): FenceItem => ({
  data: parseFencePoints(item.data),
  name: item.name,
  areatype: item.areatype
});

export function useDataManage() {
  const boatStore = useBoatStoreHook();

  const searchForm = ref<DataManageSearchForm>({
    alarmType: [],
    timeRange: [],
    review: -1,
    projectGroup: "-1"
  });

  const alarmTypeOptions = shallowRef<AlarmType[]>([]);
  const regionMap = ref<Record<number, string>>({});
  const eleFenceList = ref<FenceItem[]>([]);
  const tableData = ref<AlarmRecord[]>([]);
  const listLoading = ref(false);
  const dictLoading = ref(false);

  const buildDevidList = (): string[] => {
    const boats = boatStore.allBoats;
    if (!boats.length) return [];
    const pg = searchForm.value.projectGroup;
    if (pg !== "-1") {
      return boats.filter(b => String(b.type) === String(pg)).map(b => b.devid);
    }
    return boats.map(b => b.devid);
  };

  const fetchAlarmTypeDict = async () => {
    try {
      const res = await getDataManageAlarmTypeDict();
      alarmTypeOptions.value = dedupeAlarmTypeOptions(res.data);
    } catch (err) {
      console.error("[dataManage] /reasontype/dict/query 失败:", err);
      alarmTypeOptions.value = [];
    }
  };

  const fetchWaterRegionDict = async () => {
    try {
      const res = await getDataManageWaterRegionDict();
      const map = normalizeComboxRegionMap(res.data as ComboxRegionItemDTO[]);
      regionMap.value = Object.fromEntries(
        Object.entries(map).map(([k, v]) => [Number(k), v])
      );
    } catch (err) {
      console.error("[dataManage] /combox/dict/query 失败:", err);
      regionMap.value = {};
    }
  };

  const fetchProjectFences = async () => {
    try {
      const res = await getProjectFenceList();
      eleFenceList.value = (res.data ?? []).map(normalizeFence);
    } catch (err) {
      console.error("[dataManage] /data/projectfence/manage 失败:", err);
      eleFenceList.value = [];
    }
  };

  const fetchAlarmList = async () => {
    const devidlist = buildDevidList();
    if (!devidlist.length) {
      tableData.value = [];
      return;
    }
    const sf = searchForm.value;
    listLoading.value = true;
    try {
      const res = await postDeviceAlarmList({
        starttime: sf.timeRange[0],
        endtime: sf.timeRange[1],
        review: sf.review,
        alarmtype: sf.alarmType,
        devidlist
      });
      tableData.value = (res.data ?? []).map(normalizeAlarm);
    } catch (err) {
      console.error("[dataManage] /get/device/alarm/list 失败:", err);
      ElMessage.error("报警列表加载失败");
      tableData.value = [];
    } finally {
      listLoading.value = false;
    }
  };

  const initPageData = async () => {
    dictLoading.value = true;
    try {
      if (!boatStore.allBoats.length) {
        await boatStore.fetchBoatList();
      }
      await Promise.all([
        fetchAlarmTypeDict(),
        fetchWaterRegionDict(),
        fetchProjectFences()
      ]);
      await fetchAlarmList();
    } finally {
      dictLoading.value = false;
    }
  };

  const handleSearch = () => fetchAlarmList();

  const handleReset = () => {
    searchForm.value = {
      alarmType: [],
      timeRange: [],
      review: -1,
      projectGroup: "-1"
    };
  };

  const shipNameMap = computed<Record<string, string>>(() =>
    Object.fromEntries(boatStore.allBoats.map(b => [b.devid, b.shipname_cn]))
  );

  const alarmTypeNameMap = computed<Record<number, string>>(() =>
    Object.fromEntries(alarmTypeOptions.value.map(i => [i.id, i.des]))
  );

  onMounted(() => {
    initPageData();
  });

  return {
    searchForm,
    alarmTypeOptions,
    regionMap,
    eleFenceList,
    tableData,
    listLoading,
    dictLoading,
    shipNameMap,
    alarmTypeNameMap,
    handleSearch,
    handleReset,
    fetchAlarmList,
    fetchProjectFences
  };
}
