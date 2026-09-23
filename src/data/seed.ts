// 数据模块 —— 预置数据：两场馆、三音栓、九支音管
// 每支音管都带初测历史（音高、音分偏差、簧片状态、检修备注）。

import { Archive, Pipe, Stop, Venue } from "../domain/types";
import { evaluateInitial } from "../domain/tuning";

const INITIAL_AT = "2026-09-20T09:30:00+08:00";

interface PipeSeed {
  code: string;
  pitch: string;
  deviation: number;
  reed: Pipe["reed"];
  note: string;
}

let pipeSeq = 0;
function pipe(seed: PipeSeed): Pipe {
  pipeSeq += 1;
  return {
    id: `p${pipeSeq}`,
    code: seed.code,
    pitch: seed.pitch,
    deviation: seed.deviation,
    reed: seed.reed,
    note: seed.note,
    status: "pending",
    history: [
      {
        id: `h${pipeSeq}-init`,
        at: INITIAL_AT,
        deviation: seed.deviation,
        mean: null,
        diff: null,
        verdict: "pending",
        reed: seed.reed,
        note: seed.note,
        retested: false,
      },
    ],
  };
}

function stop(
  id: string,
  name: string,
  kind: string,
  pipeSeeds: PipeSeed[]
): Stop {
  return {
    id,
    name,
    kind,
    mean: null,
    status: "pending",
    evaluatedAt: null,
    pipes: pipeSeeds.map(pipe),
  };
}

export function buildSeedArchive(): Archive {
  const venues: Venue[] = [
    {
      id: "v1",
      name: "圣玛丽大教堂",
      kind: "教堂",
      stops: [
        stop("s1", "小号 Trumpet 8'", "簧片音栓", [
          { code: "C4", pitch: "C4", deviation: 1.0, reed: "正常", note: "音色明亮，初测稳定" },
          { code: "E4", pitch: "E4", deviation: -0.5, reed: "轻微磨损", note: "簧舌略有磨痕，留意下次复测" },
          { code: "G4", pitch: "G4", deviation: 2.5, reed: "正常", note: "调律后保持良好" },
        ]),
        stop("s2", "主音管 Principal 4'", "主音栓", [
          { code: "G3", pitch: "G3", deviation: -1.0, reed: "无簧片(唇管)", note: "唇管，风口清洁" },
          { code: "A3", pitch: "A3", deviation: 0.5, reed: "无簧片(唇管)", note: "正常" },
          { code: "B3", pitch: "B3", deviation: -2.0, reed: "无簧片(唇管)", note: "略有风压波动，观察中" },
        ]),
      ],
    },
    {
      id: "v2",
      name: "A 号音乐厅",
      kind: "音乐厅",
      stops: [
        stop("s3", "波登 Bourdon 16'", "低音音栓", [
          { code: "C2", pitch: "C2", deviation: 0.5, reed: "无簧片(唇管)", note: "木质大管，密封良好" },
          { code: "F2", pitch: "F2", deviation: 1.5, reed: "无簧片(唇管)", note: "正常" },
          { code: "G#2", pitch: "G#2", deviation: 8.0, reed: "无簧片(唇管)", note: "塞盖移位偏音，标记离群待校" },
        ]),
      ],
    },
  ];

  const archive: Archive = {
    version: 1,
    updatedAt: INITIAL_AT,
    venues,
    reports: [],
  };

  // 按规则完成初测判定（s1、s2 全通过；s3 一支离群 → 整组待校）
  for (const venue of venues) {
    for (const s of venue.stops) evaluateInitial(s, INITIAL_AT);
  }
  return archive;
}
