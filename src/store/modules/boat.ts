import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { store } from "@/store";
import { MOCK_DEVICES } from "@/views/boatDevice/shipForm/utils/dict";
import type { DeviceRecord } from "@/views/boatDevice/shipForm/utils/types";

export const useBoatStore = defineStore("boat", () => {
  const allBoats = ref<DeviceRecord[]>(MOCK_DEVICES);
  const selectedBoatId = ref("");
  const selectedBoat = computed(
    () => allBoats.value.find(b => b.devid === selectedBoatId.value) ?? null
  );

  function setSelectedBoatId(id: string | undefined) {
    selectedBoatId.value = id ?? "";
  }

  return { allBoats, selectedBoatId, selectedBoat, setSelectedBoatId };
});

export function useBoatStoreHook() {
  return useBoatStore(store);
}
