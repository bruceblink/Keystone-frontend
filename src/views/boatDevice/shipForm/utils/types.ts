export interface DeviceRecord {
  devid: string;
  shipname_cn: string;
  shipname_en: string;
  type: string;
  mmsi: string;
  lng: string;
  lat: string;
  speed: string;
  version: string;
  navstatus: string;
  remarks: string;
  create_time: string;
}

export interface SearchParams {
  keyword: string;
  type: string;
  navstatus: string;
  onlineStatus: string;
  showFavoriteOnly: boolean;
}
