// 判定模块 —— 业务类型与规则常量
// 只描述领域规则，不依赖存储与界面。

/** 音分偏差（相对标准音高） */
export type Cent = number;

/** 簧片状态 */
export type ReedState =
  | "正常"
  | "轻微磨损"
  | "待更换"
  | "已更换"
  | "无簧片(唇管)";

export const REED_STATES: ReedState[] = [
  "正常",
  "轻微磨损",
  "待更换",
  "已更换",
  "无簧片(唇管)",
];

/** 单管判定/当前状态：离群 / 待校 / 已通过 */
export type PipeVerdict = "outlier" | "pending" | "passed";
export type StopVerdict = "pending" | "passed";

export const PIPE_STATUS_TEXT: Record<PipeVerdict, string> = {
  outlier: "离群",
  pending: "待校",
  passed: "已通过",
};

export const STOP_STATUS_TEXT: Record<StopVerdict, string> = {
  pending: "待校",
  passed: "已校",
};

/** 单管偏离整组均值的允许范围（音分），超过 ±3 即离群 */
export const OUTLIER_LIMIT = 3;

/** 一条历史结论（初次测量或每次重测/重判都会留痕，历史结论保留不覆盖） */
export interface HistoryEntry {
  id: string;
  /** 测量时间（首次预置为装机初测） */
  at: string;
  /** 本次测得的音分偏差 */
  deviation: Cent;
  /** 判定时所用的整组平均偏差 */
  mean: Cent | null;
  /** 该管相对均值的差值 */
  diff: Cent | null;
  /** 本次给出的判定 */
  verdict: PipeVerdict;
  /** 当时的簧片状态 */
  reed: ReedState;
  /** 当时的检修备注 */
  note: string;
  /** true = 重测管本次实测；false = 受均值重算波及的连带重判 */
  retested: boolean;
  /** true = 曾通过的管因新均值离群，按规则退回待校 */
  regress?: boolean;
}

export interface Pipe {
  id: string;
  code: string;
  pitch: string;
  /** 当前生效的音分偏差（最近一次实测） */
  deviation: Cent;
  reed: ReedState;
  note: string;
  status: PipeVerdict;
  history: HistoryEntry[];
}

export interface Stop {
  id: string;
  name: string;
  kind: string;
  mean: Cent | null;
  status: StopVerdict;
  evaluatedAt: string | null;
  pipes: Pipe[];
}

export interface Venue {
  id: string;
  name: string;
  kind: string;
  stops: Stop[];
}

export interface RetestedPipeReport {
  pipeId: string;
  pipeCode: string;
  pitch: string;
  beforeStatus: PipeVerdict;
  afterStatus: PipeVerdict;
  beforeDeviation: Cent;
  afterDeviation: Cent;
  diff: Cent;
  retested: boolean;
  regress: boolean;
}

/** 单次维护报告：一次重测 = 一次维护 */
export interface MaintenanceReport {
  id: string;
  at: string;
  venueName: string;
  stopName: string;
  pipeCode: string;
  pitch: string;
  meanBefore: Cent;
  meanAfter: Cent;
  outliersBefore: number;
  outliersAfter: number;
  groupBefore: StopVerdict;
  groupAfter: StopVerdict;
  regressed: number;
  summary: string;
  pipes: RetestedPipeReport[];
}

export interface Archive {
  version: 1;
  updatedAt: string;
  venues: Venue[];
  reports: MaintenanceReport[];
}
