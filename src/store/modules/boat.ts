import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { store } from "@/store";
import {
  getDeviceListQuery,
  type DeviceListItemDTO
} from "@/api/boatDevice/shipForm";
import type { DeviceRecord } from "@/views/boatDevice/shipForm/utils/types";

const normalizeDevice = (item: DeviceListItemDTO): DeviceRecord => ({
  devid: String(item.devid ?? "").trim(),
  shipname_cn: item.shipname_cn ?? "",
  shipname_en: item.shipname_en ?? "",
  type: String(item.type ?? ""),
  mmsi: String(item.mmsi ?? "").trim(),
  lng: String(item.lng ?? ""),
  lat: String(item.lat ?? ""),
  speed: String(item.speed ?? ""),
  version: item.version ?? "",
  navstatus: String(item.navstatus ?? ""),
  online: String(item.online ?? ""),
  remarks: item.remarks ?? "",
  create_time: item.create_time ?? ""
});

export const useBoatStore = defineStore("boat", () => {
  const allBoats = ref<DeviceRecord[]>([]);
  const boatsLoading = ref(false);
  const selectedBoatId = ref("");
  const selectedBoat = computed(
    () => allBoats.value.find(b => b.devid === selectedBoatId.value) ?? null
  );

  async function fetchBoatList() {
    boatsLoading.value = true;
    try {
      const res = await getDeviceListQuery();
      applyDeviceList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("[boatStore] 获取船舶列表失败:", err);
      allBoats.value = [];
    } finally {
      boatsLoading.value = false;
    }
  }

  function applyDeviceList(list: DeviceListItemDTO[]) {
    allBoats.value = list.map(normalizeDevice);
  }

  function setSelectedBoatId(id: string | undefined) {
    selectedBoatId.value = id ?? "";
  }

  return {
    allBoats,
    boatsLoading,
    selectedBoatId,
    selectedBoat,
    fetchBoatList,
    applyDeviceList,
    setSelectedBoatId
  };
});

export function useBoatStoreHook() {
  return useBoatStore(store);
}
