export interface VersionItem {
  uuid: string;
  ver_name: string; // 软件名称
  version: string; // 版本号
  ver_des: string; // 发布说明
  client_path: string; // 存储路径
  fileUrl: string;
  md5: string;
  size: string; // MB
  filename: string;
  create_time: string;
}

export interface VersionForm {
  uuid?: string;
  ver_name: string;
  version: string;
  ver_des: string;
  client_path: string;
  fileUrl: string;
  md5: string;
  size: string;
  filename: string;
  create_time: string;
}
