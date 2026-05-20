export interface AlarmConfigTypeItem {
  _id: string;
  id: string;
  des: string;
  visibility: string;
  create_time?: string;
}

export interface AreaPos {
  x: number;
  y: number;
}

export interface AreaItem {
  request?: string;
  areatype?: string;
  type: string;
  name: string;
  areapos: AreaPos[];
}

export interface AlarmConfigRecord {
  _id: string;
  sid: string;
  camid: string;
  alarmtype: string;
  devid: string;
  ext1: string;
  ext2: string;
  ext3: string;
  ext4: string;
  ext5: string;
  ext6: string;
  ext7: string;
  ext8: string;
  area: AreaItem[];
  create_time: string;
}

export interface CameraItem {
  camid: string;
  devname: string;
  type: string;
  url?: string;
}

export interface ExtParam {
  key: string;
  name: string;
  description: string;
}
