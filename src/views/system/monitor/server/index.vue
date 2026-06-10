<template>
  <div class="main" v-loading="loading">
    <!-- 注意template和div之间 不要加注释  会导致后续的页面渲染空白 -->
    <!-- v-loading指令  可以直接调用Loading动画  -->
    <el-row>
      <el-col :span="24" class="card-box">
        <el-card>
          <template #header>
            <div class="network-card-header">
              <span>外网连接状态</span>
              <el-tag :type="networkStatusTagType" effect="dark">
                {{ networkStatusText }}
              </el-tag>
            </div>
          </template>
          <div class="network-overview">
            <span class="network-indicator" :class="networkIndicatorClass" />
            <span class="network-status-text">{{ networkStatusText }}</span>
            <span class="network-check-time">
              检测时间：{{ networkCheckedAtText }}
            </span>
            <span v-if="networkStreamError" class="network-error">
              {{ networkStreamError }}
            </span>
          </div>
          <el-table
            :data="networkTargetTable"
            :show-header="true"
            empty-text="等待检测结果"
            style="width: 100%"
          >
            <el-table-column prop="name" label="检测点" width="120" />
            <el-table-column
              prop="url"
              label="地址"
              min-width="220"
              show-overflow-tooltip
            />
            <el-table-column label="状态" width="120">
              <template #default="{ row }">
                <el-tag :type="row.connected ? 'success' : 'danger'">
                  {{ row.connected ? "可访问" : "不可访问" }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="延迟(ms)" width="110">
              <template #default="{ row }">
                {{ row.latencyMillis ?? "-" }}
              </template>
            </el-table-column>
            <el-table-column
              prop="message"
              label="结果"
              min-width="140"
              show-overflow-tooltip
            />
          </el-table>
        </el-card>
      </el-col>
    </el-row>
    <el-row :gutter="30">
      <el-col :span="12" class="card-box">
        <el-card>
          <template #header><span>CPU</span></template>
          <el-table
            :data="cpuInfoTable"
            :show-header="true"
            style="width: 100%"
          >
            <el-table-column prop="field" label="属性" />
            <el-table-column prop="value" label="值" />
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12" class="card-box">
        <el-card>
          <template #header><span>内存</span></template>
          <el-table
            :data="memoryInfoTable"
            :show-header="true"
            style="width: 100%"
            :cell-class-name="cellClassName"
          >
            <el-table-column prop="field" label="属性" />
            <el-table-column prop="machine" label="服务器" />
            <el-table-column prop="jvm" label="JVM" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>
    <el-row>
      <el-col :span="24" class="card-box">
        <el-card>
          <template #header><span>服务器信息</span></template>
          <el-descriptions :column="2">
            <el-descriptions-item
              v-for="(item, index) in serverInfoTable"
              :key="index"
              :label="item.field"
              >{{ item.value }}</el-descriptions-item
            >
          </el-descriptions>
        </el-card>
      </el-col>
    </el-row>
    <el-row :gutter="2">
      <el-col :span="24" class="card-box">
        <el-card>
          <template #header><span>JVM信息</span></template>
          <el-descriptions :column="2">
            <el-descriptions-item
              v-for="(item, index) in jvmInfoTable"
              :key="index"
              :label="item.field"
              :span="item.span"
              >{{ item.value }}</el-descriptions-item
            >
          </el-descriptions>
        </el-card>
      </el-col>
    </el-row>
    <el-row>
      <el-col :span="24" class="card-box">
        <el-card>
          <template #header><span>磁盘状态</span></template>
          <el-table
            :data="diskInfoTable"
            :show-header="true"
            style="width: 100%"
          >
            <el-table-column prop="dirName" label="盘符路径" />
            <el-table-column prop="sysTypeName" label="文件系统" />
            <el-table-column prop="typeName" label="盘符类型" />
            <el-table-column prop="total" label="总大小" />
            <el-table-column prop="free" label="可用大小" />
            <el-table-column prop="used" label="已用大小" />
            <el-table-column
              prop="usage"
              label="已用百分比"
              :formatter="(row, column, cellValue) => cellValue + '%'"
              width="180"
            />
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-row />
  </div>
</template>

<script setup lang="ts">
import {
  connectNetworkStatusStream,
  getServerInfoApi,
  NetworkStatus,
  ServerInfo
} from "@/api/system/monitor";
import { computed, onBeforeMount, onBeforeUnmount, ref } from "vue";

/** 组件name最好和菜单表中的router_name一致 */
defineOptions({
  name: "ServerInfo"
});

const loading = ref(true);

const cpuInfoTable = ref([]);
const memoryInfoTable = ref([]);
const serverInfoTable = ref([]);
const jvmInfoTable = ref([]);
const diskInfoTable = ref([]);
const networkStatus = ref<NetworkStatus>();
const networkStreamError = ref("");
let closeNetworkStatusStream: (() => void) | undefined;

const networkStatusText = computed(() => {
  if (!networkStatus.value) {
    return "连接中";
  }
  return networkStatus.value.online ? "外网正常" : "外网断开";
});

const networkStatusTagType = computed(() => {
  if (!networkStatus.value) {
    return "info";
  }
  return networkStatus.value.online ? "success" : "danger";
});

const networkIndicatorClass = computed(() => {
  if (!networkStatus.value) {
    return "is-checking";
  }
  return networkStatus.value.online ? "is-online" : "is-offline";
});

const networkCheckedAtText = computed(() => {
  if (!networkStatus.value?.checkedAt) {
    return "-";
  }
  return new Date(networkStatus.value.checkedAt).toLocaleString();
});

const networkTargetTable = computed(() => networkStatus.value?.targets ?? []);

async function getList() {
  loading.value = true;
  const { data } = await getServerInfoApi().finally(() => {
    loading.value = false;
  });
  const serverInfo = data as ServerInfo;

  cpuInfoTable.value = [
    {
      field: "核心数",
      value: serverInfo.cpuInfo.cpuNum
    },
    {
      field: "用户使用率",
      value: serverInfo.cpuInfo.used + "%"
    },
    {
      field: "系统使用率",
      value: serverInfo.cpuInfo.sys + "%"
    },
    {
      field: "当前空闲率",
      value: serverInfo.cpuInfo.free + "%"
    }
  ];

  memoryInfoTable.value = [
    {
      field: "总内存",
      machine: serverInfo.memoryInfo.total + "G",
      jvm: serverInfo.jvmInfo.total + "M"
    },
    {
      field: "已用内存",
      machine: serverInfo.memoryInfo.used + "G",
      jvm: serverInfo.jvmInfo.used + "M"
    },
    {
      field: "剩余内存",
      machine: serverInfo.memoryInfo.free + "G",
      jvm: serverInfo.jvmInfo.free + "M"
    },
    {
      field: "使用率",
      machine: serverInfo.memoryInfo.usage + "%",
      jvm: serverInfo.jvmInfo.usage + "%",
      // 设置warning  页面上会红字显示
      warning: serverInfo.jvmInfo.usage > 30
    }
  ];

  serverInfoTable.value = [
    {
      field: "服务器名称",
      value: serverInfo.systemInfo.computerName
    },
    {
      field: "操作系统",
      value: serverInfo.systemInfo.osName
    },
    {
      field: "服务器IP",
      value: serverInfo.systemInfo.computerIp
    },
    {
      field: "系统架构",
      value: serverInfo.systemInfo.osArch
    }
  ];

  jvmInfoTable.value = [
    {
      field: "JDK名称",
      value: serverInfo.jvmInfo.name,
      span: 1
    },
    {
      field: "JDK版本",
      value: serverInfo.jvmInfo.version,
      span: 1
    },
    {
      field: "启动时间",
      value: serverInfo.jvmInfo.startTime,
      span: 1
    },
    {
      field: "运行时长",
      value: serverInfo.jvmInfo.runTime,
      span: 1
    },
    {
      field: "安装路径",
      value: serverInfo.jvmInfo.home,
      span: 2
    },
    {
      field: "项目路径",
      value: serverInfo.systemInfo.userDir,
      span: 2
    },
    {
      field: "运行参数",
      value: serverInfo.jvmInfo.inputArgs,
      span: 2
    }
  ];

  diskInfoTable.value = serverInfo.diskInfos;
}

function cellClassName({ row }) {
  if (row.warning) {
    return "text-red-500";
  }
}

function startNetworkStatusStream() {
  const stream = connectNetworkStatusStream({
    onMessage(data) {
      networkStatus.value = data;
      networkStreamError.value = "";
    },
    onError(error) {
      networkStreamError.value =
        error instanceof Error ? error.message : "SSE连接异常";
    }
  });
  closeNetworkStatusStream = stream.close;
}

onBeforeMount(() => {
  getList();
  startNetworkStatusStream();
});

onBeforeUnmount(() => {
  closeNetworkStatusStream?.();
});
</script>

<style scoped>
.el-row {
  margin-bottom: 20px;
}

.el-row:last-child {
  margin-bottom: 0;
}

.network-card-header,
.network-overview {
  display: flex;
  gap: 12px;
  align-items: center;
}

.network-card-header {
  justify-content: space-between;
}

.network-overview {
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.network-indicator {
  width: 14px;
  height: 14px;
  background: #909399;
  border-radius: 50%;
}

.network-indicator.is-online {
  background: #67c23a;
}

.network-indicator.is-offline {
  background: #f56c6c;
}

.network-status-text {
  font-weight: 600;
}

.network-check-time {
  font-size: 13px;
  color: #909399;
}

.network-error {
  font-size: 13px;
  color: #f56c6c;
}
</style>
