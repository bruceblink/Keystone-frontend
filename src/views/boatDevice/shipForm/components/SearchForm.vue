<script setup lang="ts">
import { computed } from "vue";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import Search from "@iconify-icons/ep/search";
import Refresh from "@iconify-icons/ep/refresh";
import type { SearchParams } from "../utils/types";
import {
  GROUP_OPTIONS,
  NAV_STATUS_OPTIONS,
  ONLINE_STATUS_OPTIONS
} from "../utils/dict";

defineOptions({ name: "BoatDeviceSearchForm" });

const props = defineProps<{ modelValue: SearchParams }>();
const emit = defineEmits<{
  (e: "update:modelValue", v: SearchParams): void;
  (e: "search"): void;
  (e: "reset"): void;
  (e: "favorite-filter-change"): void;
}>();

const params = computed({
  get: () => props.modelValue,
  set: (v: SearchParams) => emit("update:modelValue", v)
});
</script>

<template>
  <el-form
    :inline="true"
    :model="params"
    class="search-form bg-bg_color w-[99/100] pl-8 pt-[12px]"
  >
    <el-form-item label="关键词" prop="keyword">
      <el-input
        v-model="params.keyword"
        placeholder="设备编号/船名/版本号"
        clearable
        class="!w-[220px]"
      />
    </el-form-item>
    <el-form-item label="所属分组" prop="type">
      <el-select
        v-model="params.type"
        placeholder="请选择分组"
        clearable
        class="!w-[140px]"
      >
        <el-option
          v-for="opt in GROUP_OPTIONS"
          :key="opt.value"
          :label="opt.label"
          :value="opt.value"
        />
      </el-select>
    </el-form-item>
    <el-form-item label="航行状态" prop="navstatus">
      <el-select
        v-model="params.navstatus"
        placeholder="请选择"
        clearable
        class="!w-[140px]"
      >
        <el-option
          v-for="opt in NAV_STATUS_OPTIONS"
          :key="opt.value"
          :label="opt.label"
          :value="opt.value"
        />
      </el-select>
    </el-form-item>
    <el-form-item label="在线状态" prop="onlineStatus">
      <el-select
        v-model="params.onlineStatus"
        placeholder="请选择"
        clearable
        class="!w-[120px]"
      >
        <el-option
          v-for="opt in ONLINE_STATUS_OPTIONS"
          :key="opt.value"
          :label="opt.label"
          :value="opt.value"
        />
      </el-select>
    </el-form-item>
    <el-form-item>
      <el-checkbox
        v-model="params.showFavoriteOnly"
        @change="emit('favorite-filter-change')"
      >
        仅显示关注
      </el-checkbox>
    </el-form-item>
    <el-form-item>
      <el-button
        type="primary"
        :icon="useRenderIcon(Search)"
        @click="emit('search')"
      >
        搜索
      </el-button>
      <el-button :icon="useRenderIcon(Refresh)" @click="emit('reset')">
        重置
      </el-button>
    </el-form-item>
  </el-form>
</template>

<style scoped lang="scss">
.search-form {
  :deep(.el-form-item) {
    margin-bottom: 12px;
  }
}
</style>
