<script setup lang="ts">
import type { DialogTable, FieldLabels, MainModuleGroup } from "../utils/types";

defineProps<{
  group: MainModuleGroup | null;
  tables: DialogTable[];
  labels: FieldLabels;
  defaultLabels: FieldLabels;
  getExt1Class: (val: unknown) => "is-success" | "is-danger" | "is-info";
}>();

const visible = defineModel<boolean>("visible", { required: true });
</script>

<template>
  <el-dialog
    v-model="visible"
    width="78%"
    top="8vh"
    destroy-on-close
    class="system-state-dialog"
  >
    <template #header>
      <div class="dlg-header">
        <span class="dlg-header__title">{{ group?.mainModule }}</span>
        <el-tag v-if="group" type="info" size="small">
          {{ group.items.length }} 个子模块
        </el-tag>
      </div>
    </template>

    <div v-if="group" class="dlg-body">
      <template v-for="(tbl, idx) in tables" :key="idx">
        <el-divider v-if="idx > 0" />
        <el-table :data="tbl.items" border stripe size="small" max-height="360">
          <el-table-column
            :label="
              tbl.labels.subModule ||
              labels.subModule ||
              defaultLabels.subModule
            "
            prop="subModule"
            min-width="120"
            show-overflow-tooltip
          />
          <el-table-column
            :label="tbl.labels.ext1 || labels.ext1 || defaultLabels.ext1"
            min-width="100"
          >
            <template #default="{ row }">
              <el-tag
                :type="
                  getExt1Class(row.ext1) === 'is-success'
                    ? 'success'
                    : getExt1Class(row.ext1) === 'is-danger'
                    ? 'danger'
                    : 'info'
                "
                size="small"
              >
                {{ row.ext1 || "—" }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            :label="tbl.labels.ext2 || labels.ext2 || defaultLabels.ext2"
            prop="ext2"
            min-width="100"
            show-overflow-tooltip
          />
          <el-table-column
            :label="tbl.labels.ext3 || labels.ext3 || defaultLabels.ext3"
            prop="ext3"
            min-width="100"
            show-overflow-tooltip
          />
          <el-table-column
            :label="tbl.labels.ext4 || labels.ext4 || defaultLabels.ext4"
            prop="ext4"
            min-width="100"
            show-overflow-tooltip
          />
          <el-table-column
            :label="tbl.labels.ext5 || labels.ext5 || defaultLabels.ext5"
            prop="ext5"
            min-width="100"
            show-overflow-tooltip
          />
          <el-table-column label="更新时间" prop="createTime" min-width="160" />
        </el-table>
      </template>
    </div>
  </el-dialog>
</template>

<style scoped lang="scss">
.dlg-header {
  display: flex;
  gap: 12px;
  align-items: center;

  &__title {
    font-size: 16px;
    font-weight: 600;
  }
}

.dlg-body {
  max-height: 70vh;
  overflow-y: auto;
}
</style>
