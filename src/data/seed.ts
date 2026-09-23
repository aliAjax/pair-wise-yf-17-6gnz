// 预置数据：两场馆、三音栓、九支音管
import type {
  Archive,
  PipeHistoryEntry,
  PipeRecord,
  ReedStatus,
} from "../types";
import { judgeStop, signed } from "../domain/rules";

const BASE_TIME = "2026-09-18T09:00:00";

interface PipeSeed {
  id: string;
  code: string;
  stopId: string;
  noteName: string;
  pitchHz: number;
  cents: number;
  reedStatus: ReedStatus;
  serviceNote: string;
}

const PIPE_SEEDS: PipeSeed[] = [
  // 圣三一堂 · Trumpet 8' 簧片音栓 —— 整组已校
  {
    id: "p1",
    code: "TR-13",
    stopId: "s1",
    noteName: "C4",
    pitchHz: 261.6,
    cents: 0,
    reedStatus: "good",
    serviceNote: "簧片清洁，调音稳定。",
  },
  {
    id: "p2",
    code: "TR-17",
    stopId: "s1",
    noteName: "E4",
    pitchHz: 330.1,
    cents: 1,
    reedStatus: "adjust",
    serviceNote: "簧舌轻微刮擦，已微调。",
  },
  {
    id: "p3",
    code: "TR-24",
    stopId: "s1",
    noteName: "A4",
    pitchHz: 440.7,
    cents: -1,
    reedStatus: "good",
    serviceNote: "正常，下次例行保养检查。",
  },
  // 圣三一堂 · Principal 4' 风管音栓 —— 整组已校
  {
    id: "p4",
    code: "PR-08",
    stopId: "s2",
    noteName: "C3",
    pitchHz: 130.6,
    cents: 2,
    reedStatus: "na",
    serviceNote: "管口积尘已清理。",
  },
  {
    id: "p5",
    code: "PR-13",
    stopId: "s2",
    noteName: "C4",
    pitchHz: 262.0,
    cents: 1,
    reedStatus: "na",
    serviceNote: "音准稳定。",
  },
  {
    id: "p6",
    code: "PR-20",
    stopId: "s2",
    noteName: "G4",
    pitchHz: 392.4,
    cents: 0,
    reedStatus: "na",
    serviceNote: "正常。",
  },
  // 城市音乐厅 · Bourdon 16' 风管音栓 —— 存在离群管，整组待校
  {
    id: "p7",
    code: "BD-02",
    stopId: "s3",
    noteName: "C2",
    pitchHz: 65.2,
    cents: 1,
    reedStatus: "na",
    serviceNote: "木管接缝有轻微漏气，已登记。",
  },
  {
    id: "p8",
    code: "BD-06",
    stopId: "s3",
    noteName: "G2",
    pitchHz: 98.1,
    cents: 1,
    reedStatus: "na",
    serviceNote: "正常。",
  },
  {
    id: "p9",
    code: "BD-10",
    stopId: "s3",
    noteName: "D3",
    pitchHz: 145.0,
    cents: -8,
    reedStatus: "na",
    serviceNote: "塞盖松动导致偏低，需复检后重调。",
  },
];

function buildPipes(raw: PipeSeed[]): PipeRecord[] {
  const judged = new Map(
    ["s1", "s2", "s3"].map((stopId) => [
      stopId,
      judgeStop(
        stopId,
        raw.map((seed) => ({
          id: seed.id,
          code: seed.code,
          stopId: seed.stopId,
          noteName: seed.noteName,
          pitchHz: seed.pitchHz,
          cents: seed.cents,
          reedStatus: seed.reedStatus,
          serviceNote: seed.serviceNote,
          measuredAt: BASE_TIME,
          history: [],
        }))
      ),
    ])
  );

  return raw.map((seed) => {
    const judgement = judged.get(seed.stopId)!;
    const verdict = judgement.verdicts.get(seed.id) ?? "passing";
    const entry: PipeHistoryEntry = {
      kind: "created",
      at: BASE_TIME,
      cents: seed.cents,
      mean: judgement.mean,
      verdict,
      note:
        verdict === "outlier"
          ? `建档测量偏差 ${signed(
              seed.cents
            )} 音分，全组均值 ${signed(
              judgement.mean
            )} 音分，偏离超过 ±3 音分判离群，整组待校`
          : `建档测量偏差 ${signed(
              seed.cents
            )} 音分，全组均值 ${signed(
              judgement.mean
            )} 音分，偏差在允许范围内`,
    };
    return {
      ...seed,
      measuredAt: BASE_TIME,
      history: [entry],
    };
  });
}

export function buildSeed(): Archive {
  return {
    version: 1,
    venues: [
      { id: "v1", name: "圣三一堂" },
      { id: "v2", name: "城市音乐厅" },
    ],
    stops: [
      { id: "s1", venueId: "v1", name: "Trumpet 8'", kind: "reed" },
      { id: "s2", venueId: "v1", name: "Principal 4'", kind: "flue" },
      { id: "s3", venueId: "v2", name: "Bourdon 16'", kind: "flue" },
    ],
    pipes: buildPipes(PIPE_SEEDS),
    reports: [
      {
        id: "r1",
        venueId: "v1",
        at: "2026-09-18T11:30:00",
        technician: "周调音师",
        temperature: 21.5,
        humidity: 48,
        scope: "例行季度校音：Trumpet 8' 与 Principal 4' 全管复测。",
        findings:
          "TR-17 簧舌轻微刮擦已微调，其余音管偏差均在 ±3 音分内；两音栓全部通过。",
        snapshots: [
          {
            stopId: "s1",
            stopName: "Trumpet 8'",
            state: "tuned",
            mean: 0,
            total: 3,
            outliers: 0,
          },
          {
            stopId: "s2",
            stopName: "Principal 4'",
            state: "tuned",
            mean: 1,
            total: 3,
            outliers: 0,
          },
        ],
      },
    ],
  };
}
