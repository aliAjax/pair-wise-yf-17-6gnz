// 界面模块 —— 存档状态与操作（数据模块 + 判定模块的界面粘合层）
import { useCallback, useMemo, useState } from "react";
import {
  Archive,
  Cent,
  MaintenanceReport,
  ReedState,
} from "../domain/types";
import { locatePipe, retestPipe } from "../domain/tuning";
import { loadArchive, resetArchive, saveArchive } from "../data/storage";

export interface RetestPayload {
  deviation: Cent;
  reed: ReedState;
  note: string;
}

export function useArchive() {
  const [archive, setArchive] = useState<Archive>(() => loadArchive());

  const commit = useCallback((next: Archive) => {
    saveArchive(next);
    setArchive(next);
  }, []);

  const retest = useCallback(
    (pipeId: string, payload: RetestPayload): MaintenanceReport => {
      const next: Archive = JSON.parse(JSON.stringify(archive)) as Archive;
      const { report } = retestPipe(next, {
        pipeId,
        deviation: payload.deviation,
        reed: payload.reed,
        note: payload.note,
        at: new Date().toISOString(),
      });
      commit(next);
      return report;
    },
    [archive, commit]
  );

  const reset = useCallback(() => {
    setArchive(resetArchive());
  }, []);

  const getPipe = useCallback(
    (pipeId: string) => locatePipe(archive, pipeId),
    [archive]
  );

  const stats = useMemo(() => {
    let stops = 0;
    let stopsPassed = 0;
    let pipes = 0;
    let outliers = 0;
    for (const v of archive.venues) {
      for (const s of v.stops) {
        stops += 1;
        if (s.status === "passed") stopsPassed += 1;
        for (const p of s.pipes) {
          pipes += 1;
          if (p.status === "outlier") outliers += 1;
        }
      }
    }
    return {
      stops,
      stopsPassed,
      pipes,
      outliers,
      pendingStops: stops - stopsPassed,
      reports: archive.reports.length,
    };
  }, [archive]);

  return { archive, retest, reset, getPipe, stats };
}
