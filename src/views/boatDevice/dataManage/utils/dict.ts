export interface AlarmType {
  id: number;
  des: string;
}

export interface AlarmRecord {
  address: string;
  alarmtype: number;
  camid: string;
  create_time: string | null;
  devid: string;
  dutylevel: number;
  ext1: string;
  ext2: string;
  lat: number;
  level: number;
  lng: number;
  picnum: number;
  picurl1: string;
  picurl2: string;
  picurl3: string;
  picurl4: string;
  reason: number;
  region: number;
  shipstatus: number;
  sid: string;
  speed: number;
  state: number;
  stime: string;
  sync: string;
  timetype: string;
  uuid: string;
  videourl: string;
  review: number;
}

export const GROUP_MAP = [
  { value: "-1", label: "全部" },
  { value: "1", label: "中远散运" },
  { value: "2", label: "中远能源" },
  { value: "3", label: "中远特运" },
  { value: "4", label: "中远集运" },
  { value: "5", label: "内部自测" }
];
