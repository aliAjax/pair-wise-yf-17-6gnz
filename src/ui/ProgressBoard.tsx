// 界面模块 · 音栓进度：按场馆列出各音栓的整组状态与均值
import { useMemo } from "react";
import { useArchive } from "../data/store";
import {
  formatCents,
  STATE_LABEL,
  STOP_KIND_LABEL,
} from "./format";
import type { Venue } from "../types";

interface ProgressBoardProps {
  onPickStop: (stopId: string) => void;
}

export function ProgressBoard({ onPickStop }: ProgressBoardProps) {
  const { archive, judge } = useArchive();

  const grouped = useMemo(() => {
    return archive.venues.map((venue: Venue) => ({
      venue,
      stops: archive.stops.filter((stop) => stop.venueId === venue.id),
    }));
  }, [archive.venues, archive.stops]);

  return (
    <div className="board">
      {grouped.map(({ venue, stops }) => {
        const venueStops = stops.map((stop) => ({
          stop,
          judgement: judge(stop.id),
          total: archive.pipes.filter((pipe) => pipe.stopId === stop.id).length,
        }));
        const tunedCount = venueStops.filter(
          ({ judgement }) => judgement.state === "tuned"
        ).length;
        const outlierCount = venueStops.reduce(
          (sum, { judgement }) => sum + judgement.outlierIds.length,
          0
        );

        return (
          <section className="panel venue-block" key={venue.id}>
            <div className="heading">
              <div>
                <p>场馆</p>
                <h2>{venue.name}</h2>
              </div>
              <div className="venue-summary">
                <span className="badge badge-tuned">
                  已校 {tunedCount}/{venueStops.length} 组
                </span>
                <span className={outlierCount > 0 ? "badge badge-outlier" : "badge"}>
                  离群音管 {outlierCount}
                </span>
              </div>
            </div>

            <div className="stop-grid">
              {venueStops.map(({ stop, judgement, total }) => (
                <button
                  key={stop.id}
                  className={`stop-card state-${judgement.state}`}
                  onClick={() => onPickStop(stop.id)}
                >
                  <div className="stop-card-top">
                    <h3>{stop.name}</h3>
                    <span
                      className={`state-pill ${
                        judgement.state === "tuned" ? "pass" : "fail"
                      }`}
                    >
                      {STATE_LABEL[judgement.state]}
                    </span>
                  </div>
                  <p className="stop-kind">{STOP_KIND_LABEL[stop.kind]}</p>
                  <dl className="stop-stats">
                    <div>
                      <dt>全组均值</dt>
                      <dd>{formatCents(judgement.mean)}</dd>
                    </div>
                    <div>
                      <dt>音管</dt>
                      <dd>
                        {total - judgement.outlierIds.length}/{total} 达标
                      </dd>
                    </div>
                  </dl>
                  <p className="stop-hint">
                    {judgement.state === "pending"
                      ? `${judgement.outlierIds.length} 支音管偏离均值超过 ±3 音分，整组回到待校，点击重测`
                      : "单管偏离均值均不超过 ±3 音分，点击查看偏差表"}
                  </p>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
