// 共享数据模型：判定、数据、界面三个业务模块共同引用

export type ReedStatus =
  | "good" // 簧片状态良好
  | "adjust" // 需要微调
  | "replace" // 待更换
  | "na"; // 非簧管（风管），不适用

export type PipeVerdict = "passing" | "outlier";

export type StopState = "pending" | "tuned";

/** 单支音管的一条历史结论，只追加、不改写 */
export interface PipeHistoryEntry {
  kind: "created" | "retested" | "regressed" | "recovered";
  at: string;
  /** 该次测量的音分偏差（建档条目可能缺省） */
  cents?: number;
  /** 该次结论依据的全组平均偏差 */
  mean?: number;
  /** 该次单管判定 */
  verdict?: PipeVerdict;
  /** 结论文字 */
  note: string;
}

/** 一支音管的最新记录 */
export interface PipeRecord {
  id: string;
  code: string; // 音管编号，如 TR-13
  stopId: string;
  noteName: string; // 音名，如 C4
  pitchHz: number; // 实测音高 Hz
  cents: number; // 音分偏差（相对全组基准）
  reedStatus: ReedStatus;
  serviceNote: string; // 检修备注
  measuredAt: string; // 最近一次测量时间 ISO
  history: PipeHistoryEntry[];
}

export interface Stop {
  id: string;
  venueId: string;
  name: string; // 音栓名，如 Trumpet 8'
  kind: "reed" | "flue" | "mixture"; // 簧片 / 风管 / 混合
}

export interface Venue {
  id: string;
  name: string;
}

/** 维护报告里对每个音栓留存的快照 */
export interface ReportStopSnapshot {
  stopId: string;
  stopName: string;
  state: StopState;
  mean: number;
  total: number;
  outliers: number;
}

/** 单次维护报告 */
export interface MaintenanceReport {
  id: string;
  venueId: string;
  at: string; // 维护时间 ISO
  technician: string;
  temperature: number; // ℃
  humidity: number; // %RH
  scope: string; // 本次维护范围说明
  findings: string; // 处理情况与结论
  snapshots: ReportStopSnapshot[];
}

/** 浏览器存档整体结构（偏差表 / 音栓进度 / 维护报告共用） */
export interface Archive {
  version: 1;
  venues: Venue[];
  stops: Stop[];
  pipes: PipeRecord[];
  reports: MaintenanceReport[];
}
