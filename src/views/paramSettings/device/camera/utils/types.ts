export type CameraItem = {
  _id: string;
  camid: string;
  devname: string;
  ipaddr: string;
  user: string;
  passwd: string;
  url: string;
  brand: string;
  type: string;
  status: string;
  areaid: string;
  areacode: string;
  sub_stream: string;
  inference: string;
  create_time: string;
  devid: string;
};

export type CameraForm = {
  _id?: string;
  camid: string;
  devname: string;
  ipaddr: string;
  user: string;
  passwd: string;
  url: string;
  brand: string;
  type: string;
  status: string;
  areaid: string;
  areacode: string;
  sub_stream: string;
  inference: string;
  create_time?: string;
};

export type ComboxRawItem = {
  name?: string;
  sort?: string | number;
  item?: string;
};

export type ComboxOption = {
  label: string;
  value: string;
};
