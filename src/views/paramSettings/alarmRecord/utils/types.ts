export interface AlarmRecordItem {
  sid: string;
  camid: string;
  alarmtype: string;
  stime: string;
  state: number;
  address: string;
  speed: string | number;
  level: string | number;
  region: string | number;
  lng: string | number;
  lat: string | number;
  picurl1: string;
  picurl2: string;
  picurl3: string;
  picurl4: string;
  videourl: string;
}

export interface AlarmSearchForm {
  alarmType: (string | number)[];
  startTime: string;
  endTime: string;
  status: number;
}

export interface MediaItem {
  type: "img";
  url: string;
}
