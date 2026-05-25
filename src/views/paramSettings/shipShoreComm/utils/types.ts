export type CommandStatus = "success" | "error" | "timeout" | "executing";

export interface HistoryItem {
  command: string;
  time: string;
  status: CommandStatus;
  result: string;
  showResult: boolean;
  resultLines: string[];
}

export interface CommandSettings {
  waitTime: number;
  serviceType: "aiservice" | "sync_service";
}
