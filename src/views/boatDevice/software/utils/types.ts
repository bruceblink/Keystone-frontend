export interface UpdateRecord {
  uuid: string;
  devid: string;
  shipname_cn: string;
  /** 设备所属分组编码，用于 GROUP_MAP 映射 */
  deviceType: string;
  name: string;
  version: string;
  size: string;
  status: string; // '0'未下载 '1'下载中 '2'下载完成
  progress: string; // 0-100
  create_time: string;
}

export interface SoftwareVersion {
  uuid: string;
  ver_name: string;
  version: string;
  size: string;
  create_time: string;
  url?: string;
  path?: string;
}

export interface DeviceItem {
  devid: string;
  shipname_cn: string;
  shipname_en: string;
  type: string;
}
