export interface AlarmTypeItem {
  _id: string;
  id: string; // 报警编号（整数字符串）
  des: string; // 报警类型名称
  type: string; // '0'=记录 '1'=报警
  alarmid: string; // 分组编号
  s2cloud: string; // '0'|'1'
  s2ship: string; // '0'|'1'
  visibility: string; // '0'|'1'
  create_time: string;
  user: string;
}

export interface AlarmTypeForm {
  _id?: string;
  id: string;
  des: string;
  type: string;
  alarmid: string;
  s2cloud: string;
  s2ship: string;
  visibility: string;
  originalDes?: string;
}
