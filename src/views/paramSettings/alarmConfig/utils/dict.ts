import type {
  AlarmConfigTypeItem,
  CameraItem,
  AlarmConfigRecord,
  ExtParam
} from "./types";

export function genId(): string {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function formatDateTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(
    d.getHours()
  )}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export const MOCK_ALARM_CONFIG_TYPES: AlarmConfigTypeItem[] = [
  {
    _id: "act001",
    id: "2001",
    des: "人员越界检测",
    visibility: "1",
    create_time: "2026-01-10 08:00:00"
  },
  {
    _id: "act002",
    id: "2002",
    des: "火焰烟雾检测",
    visibility: "1",
    create_time: "2026-01-10 08:00:00"
  },
  {
    _id: "act003",
    id: "2003",
    des: "异常聚集检测",
    visibility: "1",
    create_time: "2026-01-10 08:00:00"
  },
  {
    _id: "act004",
    id: "2004",
    des: "设备遗留检测",
    visibility: "1",
    create_time: "2026-01-10 08:00:00"
  },
  {
    _id: "act005",
    id: "2005",
    des: "人员跌倒检测",
    visibility: "1",
    create_time: "2026-01-10 08:00:00"
  },
  {
    _id: "act006",
    id: "2006",
    des: "睡岗检测",
    visibility: "1",
    create_time: "2026-01-10 08:00:00"
  },
  {
    _id: "act007",
    id: "2007",
    des: "打架斗殴检测",
    visibility: "1",
    create_time: "2026-01-10 08:00:00"
  },
  {
    _id: "act008",
    id: "2008",
    des: "船只识别",
    visibility: "1",
    create_time: "2026-01-10 08:00:00"
  },
  {
    _id: "act009",
    id: "2009",
    des: "安全帽检测",
    visibility: "1",
    create_time: "2026-01-10 08:00:00"
  },
  {
    _id: "act010",
    id: "2010",
    des: "未穿救生衣检测",
    visibility: "1",
    create_time: "2026-01-10 08:00:00"
  }
];

export const MOCK_CAMERAS: CameraItem[] = [
  { camid: "cam001", devname: "船头前视摄像机", type: "0" },
  { camid: "cam002", devname: "船舱监控摄像机", type: "0" },
  { camid: "cam003", devname: "机舱摄像机", type: "0" },
  { camid: "cam004", devname: "驾驶室摄像机", type: "0" },
  { camid: "cam005", devname: "船尾摄像机", type: "0" },
  { camid: "cam006", devname: "左舷甲板摄像机", type: "0" },
  { camid: "cam007", devname: "右舷甲板摄像机", type: "0" }
];

export const ALARM_PARAM_DEFS: Record<string, ExtParam[]> = {
  "2001": [
    {
      key: "ext1",
      name: "灵敏度",
      description: "检测灵敏度，取值 1-10，值越大越灵敏"
    },
    {
      key: "ext2",
      name: "报警间隔(秒)",
      description: "相邻两次报警的最小时间间隔"
    },
    { key: "ext3", name: "最小越界人数", description: "触发报警的最少越界人数" }
  ],
  "2002": [
    {
      key: "ext1",
      name: "置信度阈值",
      description: "检测置信度，范围 0.1-1.0"
    },
    {
      key: "ext2",
      name: "报警间隔(秒)",
      description: "相邻两次报警的最小时间间隔"
    }
  ],
  "2003": [
    {
      key: "ext1",
      name: "聚集人数阈值",
      description: "触发报警的最少聚集人数"
    },
    {
      key: "ext2",
      name: "聚集持续时间(秒)",
      description: "聚集持续多少秒后触发报警"
    },
    {
      key: "ext3",
      name: "报警间隔(秒)",
      description: "相邻两次报警的最小时间间隔"
    }
  ],
  "2004": [
    {
      key: "ext1",
      name: "遗留时间(秒)",
      description: "物品遗留多少秒后触发报警"
    },
    {
      key: "ext2",
      name: "报警间隔(秒)",
      description: "相邻两次报警的最小时间间隔"
    }
  ],
  "2005": [
    { key: "ext1", name: "灵敏度", description: "检测灵敏度，取值 1-10" },
    {
      key: "ext2",
      name: "报警间隔(秒)",
      description: "相邻两次报警的最小时间间隔"
    }
  ],
  "2006": [
    {
      key: "ext1",
      name: "检测时间(分钟)",
      description: "疑似睡岗持续多少分钟触发报警"
    },
    {
      key: "ext2",
      name: "报警间隔(秒)",
      description: "相邻两次报警的最小时间间隔"
    }
  ],
  "2007": [
    { key: "ext1", name: "灵敏度", description: "检测灵敏度，取值 1-10" },
    {
      key: "ext2",
      name: "报警间隔(秒)",
      description: "相邻两次报警的最小时间间隔"
    }
  ],
  "2008": [
    {
      key: "ext1",
      name: "置信度阈值",
      description: "检测置信度，范围 0.1-1.0"
    },
    {
      key: "ext2",
      name: "报警间隔(秒)",
      description: "相邻两次报警的最小时间间隔"
    }
  ],
  "2009": [
    { key: "ext1", name: "灵敏度", description: "检测灵敏度，取值 1-10" },
    {
      key: "ext2",
      name: "报警间隔(秒)",
      description: "相邻两次报警的最小时间间隔"
    }
  ],
  "2010": [
    { key: "ext1", name: "灵敏度", description: "检测灵敏度，取值 1-10" },
    {
      key: "ext2",
      name: "报警间隔(秒)",
      description: "相邻两次报警的最小时间间隔"
    }
  ]
};

// 内存存储：boatId → AlarmConfigRecord[]
export const alarmConfigCache: Record<string, AlarmConfigRecord[]> = {};

export function getBoatAlarmConfigs(boatId: string): AlarmConfigRecord[] {
  if (!alarmConfigCache[boatId]) alarmConfigCache[boatId] = [];
  return alarmConfigCache[boatId];
}

export function upsertAlarmConfig(
  boatId: string,
  record: AlarmConfigRecord
): void {
  if (!alarmConfigCache[boatId]) alarmConfigCache[boatId] = [];
  const idx = alarmConfigCache[boatId].findIndex(r => r._id === record._id);
  if (idx !== -1) {
    alarmConfigCache[boatId][idx] = record;
  } else {
    alarmConfigCache[boatId].push(record);
  }
}

export function removeAlarmConfig(boatId: string, id: string): void {
  if (!alarmConfigCache[boatId]) return;
  alarmConfigCache[boatId] = alarmConfigCache[boatId].filter(r => r._id !== id);
}
