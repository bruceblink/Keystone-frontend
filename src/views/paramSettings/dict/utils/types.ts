export interface DictItem {
  _id: string;
  name: string;
  value: string;
  dataType: string;
  description: string;
  user: string;
  createdTime: string;
}

export interface DictForm {
  _id?: string;
  keyname: string;
  keyvalue: string;
  type: string;
  descripton: string;
  user: string;
  create_time?: string;
}
