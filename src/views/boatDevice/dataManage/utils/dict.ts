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

/** 项目分组（dataManage / shipForm / software / version 共用） */
export { GROUP_MAP, GROUP_OPTIONS, getGroupName } from "../../dict";
