export interface GeoPoint {
  lng: number;
  lat: number;
}

export interface FenceItem {
  sid: string;
  areatype: string;
  name: string;
  datatype: string; // '0'=区域 '1'=点 '2'=线
  data: GeoPoint[];
  user: string;
  create_time: string;
}

export interface FenceForm {
  sid?: string;
  areatype: string;
  name: string;
  datatype: string;
  data: GeoPoint[];
  user: string;
}
