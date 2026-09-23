// 判定模块 —— 校音规则（纯函数，不读写存储、不碰界面）
//
// 规则：
// 1. 按音栓计算全组平均偏差（算术平均）；
// 2. 单管偏差偏离均值超过 ±3 音分即判离群，整组回到待校；
// 3. 重测任一音管后按最新均值重算该组：
//    - 重测管本次实测，按新均值重新判定；
//    - 其他原本通过的管若因此离群，只退回“待校”（不打离群印），
//      其历史结论（曾通过）保留；
//    - 原本待校/离群的连带管仍按新均值如实判定。

import {
  Archive,
  Cent,
  HistoryEntry,
  MaintenanceReport,
  OUTLIER_LIMIT,
  Pipe,
  PipeVerdict,
  RetestedPipeReport,
  Stop,
  StopVerdict,
  Venue,
} from "./types";
import { makeId } from "../data/ids";

/** 全组平均偏差，保留两位小数 */
export function meanDeviation(deviations: Cent[]): Cent | null {
  if (deviations.length === 0) return null;
  const sum = deviations.reduce((acc, v) => acc + v, 0);
  return round2(sum / deviations.length);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function isOutlier(deviation: Cent, mean: Cent): boolean {
  return Math.abs(round2(deviation - mean)) > OUTLIER_LIMIT;
}

/** 该管历史上是否拿到过“已通过”结论（历史结论保留，不因重算而抹掉） */
export function hasPassedBefore(pipe: Pipe): boolean {
  return pipe.history.some((h) => h.verdict === "passed");
}

export function stopOutlierCount(stop: Stop): number {
  const mean = stop.mean;
  if (mean === null) return 0;
  return stop.pipes.filter((p) => isOutlier(p.deviation, mean)).length;
}

interface ClassifyResult {
  mean: Cent;
  outlierIds: Set<string>;
  diffs: Map<string, Cent>;
}

/** 按当前偏差把整组分为：均值、离群管集合、各管差值 */
function classify(stop: Stop): ClassifyResult {
  const mean = meanDeviation(stop.pipes.map((p) => p.deviation)) ?? 0;
  const outlierIds = new Set<string>();
  const diffs = new Map<string, Cent>();
  for (const pipe of stop.pipes) {
    const diff = round2(pipe.deviation - mean);
    diffs.set(pipe.id, diff);
    if (Math.abs(diff) > OUTLIER_LIMIT) outlierIds.add(pipe.id);
  }
  return { mean, outlierIds, diffs };
}

function pushHistory(pipe: Pipe, entry: Omit<HistoryEntry, "id">) {
  pipe.history.push({ id: makeId("h"), ...entry });
}

/**
 * 预置初测：按初始偏差判定整组，每支音管留下一条初测历史结论。
 */
export function evaluateInitial(stop: Stop, at: string): void {
  const { mean, outlierIds, diffs } = classify(stop);
  stop.mean = mean;
  stop.evaluatedAt = at;
  for (const pipe of stop.pipes) {
    const verdict: PipeVerdict = outlierIds.has(pipe.id) ? "outlier" : "passed";
    pipe.status = verdict;
    const first = pipe.history[0];
    if (first) {
      first.mean = mean;
      first.diff = diffs.get(pipe.id) ?? null;
      first.verdict = verdict;
      first.retested = false;
    }
  }
  stop.status = outlierIds.size === 0 ? "passed" : "pending";
}

export interface RetestInput {
  pipeId: string;
  deviation: Cent;
  reed: Pipe["reed"];
  note: string;
  at: string;
}

export interface RetestResult {
  archive: Archive;
  report: MaintenanceReport;
}

/** 定位某支音管所在的场馆/音栓 */
export function locatePipe(
  archive: Archive,
  pipeId: string
): { venue: Venue; stop: Stop; pipe: Pipe } {
  for (const venue of archive.venues) {
    for (const stop of venue.stops) {
      const pipe = stop.pipes.find((p) => p.id === pipeId);
      if (pipe) return { venue, stop, pipe };
    }
  }
  throw new Error(`未找到音管 ${pipeId}`);
}

/**
 * 重测一支音管：写入实测值 → 按最新均值重算整组 →
 * 重测管如实判定；曾通过的连带离群管只退回待校并保留历史。
 * 返回本次维护报告。
 */
export function retestPipe(
  archive: Archive,
  input: RetestInput
): RetestResult {
  const { venue, stop, pipe } = locatePipe(archive, input.pipeId);

  const meanBefore = stop.mean ?? 0;
  const outliersBefore = stopOutlierCount(stop);
  const groupBefore: StopVerdict = stop.status;

  const pipeReports = new Map<string, RetestedPipeReport>();
  for (const p of stop.pipes) {
    pipeReports.set(p.id, {
      pipeId: p.id,
      pipeCode: p.code,
      pitch: p.pitch,
      beforeStatus: p.status,
      afterStatus: p.status,
      beforeDeviation: p.deviation,
      afterDeviation: p.deviation,
      diff: 0,
      retested: p.id === pipe.id,
      regress: false,
    });
  }

  // 1. 记录重测管的实测
  pipe.deviation = input.deviation;
  pipe.reed = input.reed;
  pipe.note = input.note;

  // 2. 按最新均值重算整组
  const { mean, outlierIds, diffs } = classify(stop);
  stop.mean = mean;
  stop.evaluatedAt = input.at;

  const regressedPipes: Pipe[] = [];

  for (const p of stop.pipes) {
    const diff = diffs.get(p.id) ?? 0;
    const beforeStatus = p.status;
    let verdict: PipeVerdict;
    let regress = false;

    if (p.id === pipe.id) {
      // 重测管：本次实测，如实判定
      verdict = outlierIds.has(p.id) ? "outlier" : "passed";
      pushHistory(p, {
        at: input.at,
        deviation: p.deviation,
        mean,
        diff,
        verdict,
        reed: p.reed,
        note: p.note,
        retested: true,
      });
    } else if (outlierIds.has(p.id)) {
      if (beforeStatus === "passed" && hasPassedBefore(p)) {
        // 原本通过、因此离群：只退回待校，历史结论保留
        verdict = "pending";
        regress = true;
        regressedPipes.push(p);
      } else {
        verdict = "outlier";
      }
      if (beforeStatus !== verdict) {
        pushHistory(p, {
          at: input.at,
          deviation: p.deviation,
          mean,
          diff,
          verdict,
          reed: p.reed,
          note: p.note,
          retested: false,
          regress,
        });
      }
    } else {
      verdict = "passed";
      if (beforeStatus !== "passed") {
        pushHistory(p, {
          at: input.at,
          deviation: p.deviation,
          mean,
          diff,
          verdict,
          reed: p.reed,
          note: p.note,
          retested: false,
        });
      }
    }

    p.status = verdict;
    const rep = pipeReports.get(p.id)!;
    rep.afterStatus = verdict;
    rep.afterDeviation = p.deviation;
    rep.diff = diff;
    rep.regress = regress;
  }

  const outliersAfter = stopOutlierCount(stop);
  const anyNotPassed = stop.pipes.some((p) => p.status !== "passed");
  stop.status = anyNotPassed ? "pending" : "passed";

  const pipes = stop.pipes.map((p) => pipeReports.get(p.id)!);
  const retestedRep = pipeReports.get(pipe.id)!;

  const summary = buildSummary({
    pipeCode: pipe.code,
    pitch: pipe.pitch,
    beforeDeviation: retestedRep.beforeDeviation,
    afterDeviation: input.deviation,
    meanBefore,
    meanAfter: mean,
    outliersAfter,
    regressed: regressedPipes,
    groupAfter: stop.status,
  });

  const report: MaintenanceReport = {
    id: makeId("r"),
    at: input.at,
    venueName: venue.name,
    stopName: stop.name,
    pipeCode: pipe.code,
    pitch: pipe.pitch,
    meanBefore,
    meanAfter: mean,
    outliersBefore,
    outliersAfter,
    groupBefore,
    groupAfter: stop.status,
    regressed: regressedPipes.length,
    summary,
    pipes,
  };

  archive.reports.unshift(report);
  archive.updatedAt = input.at;

  return { archive, report };
}

function buildSummary(args: {
  pipeCode: string;
  pitch: string;
  beforeDeviation: Cent;
  afterDeviation: Cent;
  meanBefore: Cent;
  meanAfter: Cent;
  outliersAfter: number;
  regressed: Pipe[];
  groupAfter: StopVerdict;
}): string {
  const {
    pipeCode,
    pitch,
    beforeDeviation,
    afterDeviation,
    meanBefore,
    meanAfter,
    outliersAfter,
    regressed,
    groupAfter,
  } = args;
  const parts: string[] = [
    `重测 ${pipeCode}（${pitch}）：偏差 ${fmtSigned(beforeDeviation)} → ${fmtSigned(
      afterDeviation
    )} 音分`,
    `全组均值 ${fmtSigned(meanBefore)} → ${fmtSigned(meanAfter)} 音分`,
  ];
  if (regressed.length > 0) {
    parts.push(
      `原已通过的 ${regressed.map((p) => p.code).join("、")} 受均值影响退回待校（历史结论保留）`
    );
  }
  parts.push(
    outliersAfter > 0
      ? `当前离群 ${outliersAfter} 支，整组待校`
      : groupAfter === "passed"
        ? "全管在 ±3 音分内，整组已校"
        : "无离群但仍有待校管，整组待校"
  );
  return parts.join("；");
}

export function fmtSigned(n: Cent): string {
  const v = round2(n);
  return `${v > 0 ? "+" : ""}${v}`;
}
