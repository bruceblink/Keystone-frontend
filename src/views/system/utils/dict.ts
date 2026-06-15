import { computed, ref, type ComputedRef, type Ref } from "vue";
import { getDictDataByTypeApi, type DictDataDTO } from "@/api/system/dict";

export type SystemDictValue = string | number | boolean;
export type SystemDictValueType = "string" | "number" | "boolean";

export type SystemDictOption<T extends SystemDictValue = SystemDictValue> = {
  label: string;
  value: T;
  cssTag?: string;
  raw: DictDataDTO;
};

type SystemDictState = {
  data: Ref<DictDataDTO[]>;
  loading: Ref<boolean>;
  pending?: Promise<void>;
};

type UseSystemDictOptions<T extends SystemDictValueType> = {
  valueType?: T;
};

type ValueByType<T extends SystemDictValueType> = T extends "number"
  ? number
  : T extends "boolean"
  ? boolean
  : string;

const cache = new Map<string, SystemDictState>();

function getState(dictType: string): SystemDictState {
  let state = cache.get(dictType);
  if (!state) {
    state = {
      data: ref<DictDataDTO[]>([]),
      loading: ref(false)
    };
    cache.set(dictType, state);
  }
  return state;
}

async function loadDictData(dictType: string, force = false) {
  const state = getState(dictType);
  if (!force && state.data.value.length) {
    return;
  }
  if (state.pending) {
    return state.pending;
  }

  state.loading.value = true;
  state.pending = getDictDataByTypeApi(dictType)
    .then(({ data }) => {
      state.data.value = data ?? [];
    })
    .finally(() => {
      state.loading.value = false;
      state.pending = undefined;
    });

  return state.pending;
}

function normalizeValue(
  value: string | undefined,
  valueType: SystemDictValueType
) {
  const rawValue = value ?? "";
  if (valueType === "number") {
    const numericValue = Number(rawValue);
    return Number.isNaN(numericValue) ? 0 : numericValue;
  }
  if (valueType === "boolean") {
    return rawValue === "true" || rawValue === "1";
  }
  return rawValue;
}

function toOptions<T extends SystemDictValueType>(
  data: DictDataDTO[],
  valueType: T
): SystemDictOption<ValueByType<T>>[] {
  return data.map(item => ({
    label: item.dictLabel ?? "",
    value: normalizeValue(item.dictValue, valueType) as ValueByType<T>,
    cssTag: item.listClass || item.cssClass || undefined,
    raw: item
  }));
}

export function useSystemDict<T extends SystemDictValueType = "number">(
  dictType: string,
  options: UseSystemDictOptions<T> = {}
): {
  options: ComputedRef<SystemDictOption<ValueByType<T>>[]>;
  map: ComputedRef<Record<string, SystemDictOption<ValueByType<T>>>>;
  loading: Ref<boolean>;
  reload: () => Promise<void>;
} {
  const valueType = options.valueType ?? ("number" as T);
  const state = getState(dictType);

  void loadDictData(dictType);

  const dictOptions = computed(() => toOptions(state.data.value, valueType));
  const dictMap = computed(() =>
    dictOptions.value.reduce((result, item) => {
      result[String(item.value)] = item;
      return result;
    }, {} as Record<string, SystemDictOption<ValueByType<T>>>)
  );

  return {
    options: dictOptions,
    map: dictMap,
    loading: state.loading,
    reload: () => loadDictData(dictType, true)
  };
}
