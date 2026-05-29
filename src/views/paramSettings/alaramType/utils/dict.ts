import type { AlarmTypeItem } from "./types";

export function formatDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function genId(): string {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const TYPE_MAP: Record<string, string> = {
  "0": "记录",
  "1": "报警"
};

export const MOCK_ALARM_TYPES: AlarmTypeItem[] = [
  {
    _id: "at001",
    id: "1001",
    des: "超速报警",
    type: "1",
    alarmid: "10",
    s2cloud: "1",
    s2ship: "1",
    visibility: "1",
    create_time: "2026/1/1 08:00:00",
    user: "admin"
  },
  {
    _id: "at002",
    id: "1002",
    des: "越界报警",
    type: "1",
    alarmid: "10",
    s2cloud: "1",
    s2ship: "0",
    visibility: "1",
    create_time: "2026/1/2 09:00:00",
    user: "admin"
  },
  {
    _id: "at003",
    id: "1003",
    des: "偏航记录",
    type: "0",
    alarmid: "11",
    s2cloud: "0",
    s2ship: "1",
    visibility: "1",
    create_time: "2026/1/3 10:00:00",
    user: "admin"
  },
  {
    _id: "at004",
    id: "1004",
    des: "进港报警",
    type: "1",
    alarmid: "11",
    s2cloud: "1",
    s2ship: "1",
    visibility: "0",
    create_time: "2026/1/4 11:00:00",
    user: "admin"
  },
  {
    _id: "at005",
    id: "1005",
    des: "低速记录",
    type: "0",
    alarmid: "12",
    s2cloud: "0",
    s2ship: "0",
    visibility: "1",
    create_time: "2026/1/5 12:00:00",
    user: "admin"
  }
];
