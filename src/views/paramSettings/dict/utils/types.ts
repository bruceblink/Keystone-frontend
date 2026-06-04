export interface DictItem {
  _id: string;
  dictType: string;
  name: string;
  value: string;
  groupKey: string;
  groupName: string;
  dataType: string;
  description: string;
  user: string;
  createdTime: string;
}

export interface DictForm {
  _id?: string;
  dictType?: string;
  keyname: string;
  keyvalue: string;
  groupKey?: string;
  type: string;
  descripton: string;
  user: string;
  create_time?: string;
}

export interface DictTypeItem {
  dictType: string;
  dictName: string;
  category: string;
  scope: string;
  status: number;
  sort: number;
  remark: string;
  aliases: string[];
}

export interface DictTypeForm {
  dictType: string;
  dictName: string;
  category: string;
  scope: string;
  status: number;
  sort: number;
  remark: string;
  aliases: string[];
}
