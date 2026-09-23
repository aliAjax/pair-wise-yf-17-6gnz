// 界面模块 —— 音栓面板：音栓进度 + 偏差表
import { Fragment, useState } from "react";
import {
  OUTLIER_LIMIT,
  PIPE_STATUS_TEXT,
  Pipe,
  Stop,
} from "../domain/types";
import { isOutlier } from "../domain/tuning";
import { fmtCent, fmtTime } from "./format";
import { PipeHistory } from "./PipeHistory";

interface Props {
  stop: Stop;
  onRetest: (pipe: Pipe) => void;
}

export function StopPanel({ stop, onRetest }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const mean = stop.mean ?? 0;
  const outlierCount = stop.pipes.filter((p) =>
    isOutlier(p.deviation, mean)
  ).length;
  const passedCount = stop.pipes.filter((p) => p.status === "passed").length;
  const progress = Math.round((passedCount / stop.pipes.length) * 100);

  return (
    <section className={`panel stop-panel status-stop-${stop.status}`}>
      <header className="stop-head">
        <div>
          <p className="eyebrow">{stop.kind}</p>
          <h3>{stop.name}</h3>
          <p className="stop-meta">
            全组平均偏差{" "}
            <strong className={outlierCount > 0 ? "text-danger" : "text-ok"}>
              {fmtCent(stop.mean)}
            </strong>{" "}
            音分 · 判定时间 {fmtTime(stop.evaluatedAt)}
          </p>
        </div>
        <div className="stop-progress">
          <span className={`badge big status-stop-${stop.status}`}>
            {stop.status === "passed" ? "整组已校" : "整组待校"}
          </span>
          <div className="progress-track">
            <div className="progress-bar" style={{ width: `${progress}%` }} />
          </div>
          <small>
            {passedCount}/{stop.pipes.length} 支通过 · 离群 {outlierCount} 支
          </small>
        </div>
      </header>

      <div className="table-wrap">
        <table className="deviation-table">
          <thead>
            <tr>
              <th>音管编号</th>
              <th>音高</th>
              <th>音分偏差</th>
              <th>偏离均值</th>
              <th>簧片状态</th>
              <th>状态判定</th>
              <th>检修备注</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {stop.pipes.map((p) => {
              const diff = Math.round((p.deviation - mean) * 100) / 100;
              const numericOutlier = Math.abs(diff) > OUTLIER_LIMIT;
              const open = openId === p.id;
              return (
                <Fragment key={p.id}>
                  <tr
                    className={numericOutlier ? "row-outlier" : undefined}
                  >
                    <td className="cell-code">{p.code}</td>
                    <td>{p.pitch}</td>
                    <td className="cell-num">{fmtCent(p.deviation)}</td>
                    <td className="cell-num">
                      <span className={numericOutlier ? "text-danger" : undefined}>
                        {fmtCent(diff)}
                        {numericOutlier && (
                          <em className="outlier-flag" title={`超出 ±${OUTLIER_LIMIT} 音分`}>
                            超{OUTLIER_LIMIT}
                          </em>
                        )}
                      </span>
                    </td>
                    <td>{p.reed}</td>
                    <td>
                      <span className={`badge status-${p.status}`}>
                        {PIPE_STATUS_TEXT[p.status]}
                      </span>
                    </td>
                    <td className="cell-note">{p.note || "—"}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="link-btn"
                          onClick={() => onRetest(p)}
                        >
                          重测
                        </button>
                        <button
                          className="link-btn ghost"
                          onClick={() =>
                            setOpenId(open ? null : p.id)
                          }
                        >
                          {open ? "收起历史" : `历史(${p.history.length})`}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {open && (
                    <tr className="history-row">
                      <td colSpan={8}>
                        <PipeHistory pipe={p} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {outlierCount > 0 && (
        <p className="stop-rule-note danger">
          ⚠ 存在 {outlierCount} 支音管偏离均值超过 ±{OUTLIER_LIMIT}
          音分，整组判定为待校。
        </p>
      )}
      {outlierCount === 0 && stop.status === "passed" && (
        <p className="stop-rule-note ok">
          ✓ 全部音管在 ±{OUTLIER_LIMIT} 音分阈值内，整组已校。
        </p>
      )}
      {outlierCount === 0 && stop.status === "pending" && (
        <p className="stop-rule-note muted">
          无数值离群，但有音管处于待校（曾通过的音管受均值波及被退回），整组待校；历史结论保留。
        </p>
      )}
    </section>
  );
}
