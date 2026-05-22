export type FieldLabels = {
  mainModule?: string;
  subModule?: string;
  ext1?: string;
  ext2?: string;
  ext3?: string;
  ext4?: string;
  ext5?: string;
};

export type ModuleMessage = {
  mainModule: string;
  subModule: string;
  ext1: string;
  ext2: string;
  ext3: string;
  ext4: string;
  ext5: string;
  createTime?: string;
  fieldLabels?: FieldLabels;
  _unmapped?: { extKey: string; extValue: string }[];
  [key: string]: unknown;
};

export type MainModuleGroup = {
  mainModule: string;
  items: ModuleMessage[];
  statusText: string;
  statusClass: "is-success" | "is-danger";
};

export type DialogTable = {
  labels: FieldLabels;
  items: ModuleMessage[];
};
