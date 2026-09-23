// 判定业务模块：纯函数，只负责校音规则，不碰存档与 React
import type {
  PipeHistoryEntry,
  PipeRecord,
  PipeVerdict,
  StopState,
} from "../types";

/** 单管偏离均值超过 ±3 音分即判离群（不含恰好 ±3） */
export const OUTLIER_LIMIT = 3;

export function isOutlier(cents: number, mean: number): boolean {
  return Math.abs(cents - mean) > OUTLIER_LIMIT;
}

export function verdictOf(cents: number, mean: number): PipeVerdict {
  return isOutlier(cents, mean) ? "outlier" : "passing";
}

export function averageCents(centsList: number[]): number {
  if (centsList.length === 0) return 0;
  return centsList.reduce((sum, value) => sum + value, 0) / centsList.length;
}

/** 保留一位小数，避免展示出浮点尾巴 */
export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export interface StopJudgement {
  mean: number;
  state: StopState;
  /** 每支音管相对最新均值的判定 */
  verdicts: Map<string, PipeVerdict>;
  outlierIds: string[];
}

/** 按音栓算全组平均偏差；任一音管离群，整组回到待校 */
export function judgeStop(
  stopId: string,
  pipes: PipeRecord[]
): StopJudgement {
  const members = pipes.filter((pipe) => pipe.stopId === stopId);
  const mean = averageCents(members.map((pipe) => pipe.cents));
  const verdicts = new Map<string, PipeVerdict>();
  const outlierIds: string[] = [];
  for (const pipe of members) {
    const verdict = verdictOf(pipe.cents, mean);
    verdicts.set(pipe.id, verdict);
    if (verdict === "outlier") outlierIds.push(pipe.id);
  }
  return {
    mean: round1(mean),
    state: outlierIds.length > 0 ? "pending" : "tuned",
    verdicts,
    outlierIds,
  };
}

export interface RetestInput {
  pipeId: string;
  cents: number;
  pitchHz: number;
  reedStatus: PipeRecord["reedStatus"];
  serviceNote: string;
  at: string;
  /** 同组其它音管（含被测管）当前记录，用于算最新均值 */
  groupPipes: PipeRecord[];
}

export interface RetestResult {
  pipes: PipeRecord[];
  /** 本次重测后该组的判定 */
  judgement: StopJudgement;
}

function historyNote(
  kind: PipeHistoryEntry["kind"],
  cents: number,
  mean: number,
  verdict: PipeVerdict
): string {
  if (kind === "retested") {
    const detail =
      verdict === "outlier" ? "重测后仍偏离均值，判离群" : "重测后回到允许范围";
    return `重测偏差 ${signed(cents)} 音分，全组均值 ${signed(
      mean
    )} 音分，${detail}`;
  }
  if (kind === "regressed") {
    return `同组重测使均值变为 ${signed(
      mean
    )} 音分，本管偏差 ${signed(cents)} 音分被动离群，退回待校；历史结论保留`;
  }
  return `同组重测使均值变为 ${signed(
    mean
  )} 音分，本管偏差 ${signed(cents)} 音分恢复达标`;
}

/**
 * 重测任一音管：被测管采用新数据并按最新均值重算该组；
 * 原本通过的音管若因此离群，只退回待校（追加 regressed 历史），
 * 历史结论一律保留；原本离群而恢复的追加 recovered。
 */
export function retestPipe(input: RetestInput): RetestResult {
  const { pipeId, cents, pitchHz, reedStatus, serviceNote, at, groupPipes } =
    input;

  const measured = new Map<string, PipeRecord>();
  for (const pipe of groupPipes) measured.set(pipe.id, pipe);
  const target = measured.get(pipeId);
  if (!target) {
    return {
      pipes: groupPipes,
      judgement: {
        mean: 0,
        state: "pending",
        verdicts: new Map(),
        outlierIds: [],
      },
    };
  }

  // 重测前的旧判定，用于判断其他音管是否"原本通过"
  const oldMean = averageCents(groupPipes.map((pipe) => pipe.cents));
  const oldVerdicts = new Map<string, PipeVerdict>();
  for (const pipe of groupPipes) {
    oldVerdicts.set(pipe.id, verdictOf(pipe.cents, oldMean));
  }

  const updatedTarget: PipeRecord = {
    ...target,
    cents,
    pitchHz,
    reedStatus,
    serviceNote,
    measuredAt: at,
  };
  measured.set(pipeId, updatedTarget);

  const members = groupPipes.map((pipe) =>
    pipe.id === pipeId ? updatedTarget : pipe
  );
  const judgement = judgeStop(target.stopId, members);
  const newMean = judgement.mean;

  const next = members.map((pipe) => {
    const verdict = judgement.verdicts.get(pipe.id) ?? "passing";
    const before = oldVerdicts.get(pipe.id) ?? "passing";

    if (pipe.id === pipeId) {
      const entry: PipeHistoryEntry = {
        kind: "retested",
        at,
        cents,
        mean: newMean,
        verdict,
        note: historyNote("retested", cents, newMean, verdict),
      };
      return { ...pipe, history: [...pipe.history, entry] };
    }

    if (before === "passing" && verdict === "outlier") {
      const entry: PipeHistoryEntry = {
        kind: "regressed",
        at,
        cents: pipe.cents,
        mean: newMean,
        verdict,
        note: historyNote("regressed", pipe.cents, newMean, verdict),
      };
      return { ...pipe, history: [...pipe.history, entry] };
    }

    if (before === "outlier" && verdict === "passing") {
      const entry: PipeHistoryEntry = {
        kind: "recovered",
        at,
        cents: pipe.cents,
        mean: newMean,
        verdict,
        note: historyNote("recovered", pipe.cents, newMean, verdict),
      };
      return { ...pipe, history: [...pipe.history, entry] };
    }

    return pipe;
  });

  return {
    pipes: next,
    judgement: { ...judgement, verdicts: new Map(judgement.verdicts) },
  };
}

/** 带正负号的音分展示，如 +1.5 / -2 / 0.0 */
export function signed(value: number): string {
  const rounded = round1(value);
  if (rounded > 0) return `+${rounded}`;
  return `${rounded}`;
}
