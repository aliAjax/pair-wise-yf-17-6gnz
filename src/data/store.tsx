// 数据业务模块：唯一的存档入口，界面只通过这里读写
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  Archive,
  MaintenanceReport,
  PipeRecord,
  ReedStatus,
  ReportStopSnapshot,
} from "../types";
import { judgeStop, retestPipe, type StopJudgement } from "../domain/rules";
import { loadArchive, resetArchive, saveArchive } from "./archive";
import { uid } from "./id";

export interface RetestDraft {
  cents: number;
  pitchHz: number;
  reedStatus: ReedStatus;
  serviceNote: string;
}

interface ArchiveContextValue {
  archive: Archive;
  /** 计算某音栓的当前判定（均值、离群管、整组状态） */
  judge: (stopId: string) => StopJudgement;
  /** 重测一支音管，整组按最新均值重算 */
  retest: (pipeId: string, draft: RetestDraft) => void;
  /** 归档一次维护报告，快照取存档内该场馆各音栓的最新判定 */
  addReport: (
    report: Omit<MaintenanceReport, "id" | "at" | "snapshots">
  ) => MaintenanceReport;
  reset: () => void;
}

const ArchiveContext = createContext<ArchiveContextValue | null>(null);

function snapshotsForVenue(archive: Archive, venueId: string): ReportStopSnapshot[] {
  return archive.stops
    .filter((stop) => stop.venueId === venueId)
    .map((stop) => {
      const judgement = judgeStop(stop.id, archive.pipes);
      return {
        stopId: stop.id,
        stopName: stop.name,
        state: judgement.state,
        mean: judgement.mean,
        total: archive.pipes.filter((pipe) => pipe.stopId === stop.id).length,
        outliers: judgement.outlierIds.length,
      };
    });
}

export function ArchiveProvider({ children }: { children: ReactNode }) {
  const [archive, setArchive] = useState<Archive>(() => loadArchive());
  // 判定缓存：存档不变则不重算
  const judgeCache = useRef<{
    key: string;
    map: Map<string, StopJudgement>;
  }>({ key: "", map: new Map() });

  const persist = useCallback((next: Archive) => {
    setArchive(next);
    saveArchive(next);
  }, []);

  const judge = useCallback(
    (stopId: string): StopJudgement => {
      const key = archive.pipes.map((pipe) => `${pipe.id}:${pipe.cents}`).join("|");
      if (judgeCache.current.key !== key) {
        judgeCache.current = { key, map: new Map() };
      }
      const cache = judgeCache.current.map;
      if (!cache.has(stopId)) {
        cache.set(stopId, judgeStop(stopId, archive.pipes));
      }
      return cache.get(stopId)!;
    },
    [archive.pipes]
  );

  const retest = useCallback(
    (pipeId: string, draft: RetestDraft) => {
      const target = archive.pipes.find((pipe) => pipe.id === pipeId);
      if (!target) return;
      const groupPipes = archive.pipes.filter(
        (pipe) => pipe.stopId === target.stopId
      );
      const result = retestPipe({
        pipeId,
        ...draft,
        at: new Date().toISOString(),
        groupPipes,
      });
      const updated = new Map(result.pipes.map((pipe) => [pipe.id, pipe]));
      const nextPipes: PipeRecord[] = archive.pipes.map(
        (pipe) => updated.get(pipe.id) ?? pipe
      );
      persist({ ...archive, pipes: nextPipes });
    },
    [archive, persist]
  );

  const addReport = useCallback(
    (report: Omit<MaintenanceReport, "id" | "at" | "snapshots">) => {
      const full: MaintenanceReport = {
        ...report,
        id: uid("r"),
        at: new Date().toISOString(),
        snapshots: snapshotsForVenue(archive, report.venueId),
      };
      persist({ ...archive, reports: [full, ...archive.reports] });
      return full;
    },
    [archive, persist]
  );

  const reset = useCallback(() => {
    persist(resetArchive());
  }, [persist]);

  const value = useMemo(
    () => ({ archive, judge, retest, addReport, reset }),
    [archive, judge, retest, addReport, reset]
  );

  return (
    <ArchiveContext.Provider value={value}>{children}</ArchiveContext.Provider>
  );
}

export function useArchive(): ArchiveContextValue {
  const ctx = useContext(ArchiveContext);
  if (!ctx) throw new Error("useArchive 必须在 ArchiveProvider 内使用");
  return ctx;
}
