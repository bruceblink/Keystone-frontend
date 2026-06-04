import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { store } from "@/store";
import {
  getLocalDeviceInfo,
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
  const deploymentSide = ref<"ship" | "shore" | string>("shore");
  const localDevice = ref<DeviceRecord | null>(null);
  const isShipSide = computed(() => deploymentSide.value === "ship");
  const selectedBoat = computed(
    () => allBoats.value.find(b => b.devid === selectedBoatId.value) ?? null
  );

  async function fetchBoatList() {
    boatsLoading.value = true;
    try {
      const [localRes, listRes] = await Promise.all([
        getLocalDeviceInfo().catch(() => null),
        getDeviceListQuery()
      ]);
      deploymentSide.value = localRes?.data?.side ?? "shore";
      localDevice.value = localRes?.data?.device
        ? normalizeDevice(localRes.data.device)
        : null;
      const res = listRes;
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
    if (isShipSide.value) {
      selectedBoatId.value =
        localDevice.value?.devid ?? allBoats.value[0]?.devid ?? "";
      return;
    }
    if (
      selectedBoatId.value &&
      allBoats.value.some(b => b.devid === selectedBoatId.value)
    ) {
      return;
    }
    selectedBoatId.value =
      localDevice.value?.devid ?? allBoats.value[0]?.devid ?? "";
  }

  function setSelectedBoatId(id: string | undefined) {
    if (isShipSide.value) {
      selectedBoatId.value =
        localDevice.value?.devid ?? allBoats.value[0]?.devid ?? "";
      return;
    }
    selectedBoatId.value = id ?? "";
  }

  return {
    allBoats,
    boatsLoading,
    selectedBoatId,
    deploymentSide,
    localDevice,
    isShipSide,
    selectedBoat,
    fetchBoatList,
    applyDeviceList,
    setSelectedBoatId
  };
});

export function useBoatStoreHook() {
  return useBoatStore(store);
}
