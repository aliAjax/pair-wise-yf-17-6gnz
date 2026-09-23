// 界面模块 · 偏差表：选定音栓后逐管记录音高/偏差/簧片状态/检修备注，支持重测与历史
import { useMemo, useState } from "react";
import { useArchive, type RetestDraft } from "../data/store";
import {
  REED_LABEL,
  REED_OPTIONS,
  STATE_LABEL,
  VERDICT_LABEL,
  formatCents,
  formatDateTime,
  formatHz,
} from "./format";
import { OUTLIER_LIMIT, signed } from "../domain/rules";
import type { PipeRecord } from "../types";

interface DeviationTableProps {
  stopId: string;
  onChangeStop: (stopId: string) => void;
}

export function DeviationTable({ stopId, onChangeStop }: DeviationTableProps) {
  const { archive, judge, retest } = useArchive();
  const [retestingId, setRetestingId] = useState<string | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);

  const stop = archive.stops.find((item) => item.id === stopId);
  const judgement = judge(stopId);
  const members = useMemo(
    () => archive.pipes.filter((pipe) => pipe.stopId === stopId),
    [archive.pipes, stopId]
  );
  const venue = archive.venues.find((item) => item.id === stop?.venueId);

  if (!stop) {
    return <section className="panel">请选择一个音栓。</section>;
  }

  const submitRetest = (pipe: PipeRecord, draft: RetestDraft) => {
    retest(pipe.id, draft);
    setRetestingId(null);
  };

  return (
    <section className="panel deviation-panel">
      <div className="heading">
        <div>
          <p>偏差表</p>
          <h2>
            {venue?.name} · {stop.name}
          </h2>
        </div>
        <select
          className="input select-stop"
          value={stopId}
          onChange={(event) => {
            onChangeStop(event.target.value);
            setRetestingId(null);
            setHistoryId(null);
          }}
        >
          {archive.venues.map((v) => (
            <optgroup label={v.name} key={v.id}>
              {archive.stops
                .filter((item) => item.venueId === v.id)
                .map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div
        className={`group-banner ${
          judgement.state === "tuned" ? "pass" : "fail"
        }`}
      >
        <strong>整组状态：{STATE_LABEL[judgement.state]}</strong>
        <span>
          全组平均偏差 {formatCents(judgement.mean)}（{members.length} 支管，
          {judgement.outlierIds.length} 支离群）
        </span>
        <span className="banner-rule">
          判定规则：单管偏离均值超过 ±{OUTLIER_LIMIT} 音分即离群，整组回到待校；重测任一管后按最新均值重算全组
        </span>
      </div>

      <div className="table-wrap">
        <table className="deviation-table">
          <thead>
            <tr>
              <th>音管编号</th>
              <th>音高</th>
              <th>实测音分偏差</th>
              <th>偏离均值</th>
              <th>判定</th>
              <th>簧片状态</th>
              <th>检修备注</th>
              <th>测量时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {members.map((pipe) => {
              const verdict = judgement.verdicts.get(pipe.id) ?? "passing";
              const diff = Math.round((pipe.cents - judgement.mean) * 10) / 10;
              const outlier = verdict === "outlier";
              return (
                <FragmentRow
                  key={pipe.id}
                  pipe={pipe}
                  outlier={outlier}
                  diff={diff}
                  expandedHistory={historyId === pipe.id}
                  retesting={retestingId === pipe.id}
                  onToggleHistory={() =>
                    setHistoryId((current) =>
                      current === pipe.id ? null : pipe.id
                    )
                  }
                  onStartRetest={() => {
                    setRetestingId(pipe.id);
                    setHistoryId(null);
                  }}
                  onCancelRetest={() => setRetestingId(null)}
                  onSubmitRetest={(draft) => submitRetest(pipe, draft)}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

interface RowProps {
  pipe: PipeRecord;
  outlier: boolean;
  diff: number;
  expandedHistory: boolean;
  retesting: boolean;
  onToggleHistory: () => void;
  onStartRetest: () => void;
  onCancelRetest: () => void;
  onSubmitRetest: (draft: RetestDraft) => void;
}

function FragmentRow({
  pipe,
  outlier,
  diff,
  expandedHistory,
  retesting,
  onToggleHistory,
  onStartRetest,
  onCancelRetest,
  onSubmitRetest,
}: RowProps) {
  return (
    <>
      <tr className={outlier ? "row-outlier" : "row-passing"}>
        <td className="cell-code">
          <b>{pipe.code}</b>
          <span className="note-name">{pipe.noteName}</span>
        </td>
        <td>{formatHz(pipe.pitchHz)}</td>
        <td className="cell-cents">{formatCents(pipe.cents)}</td>
        <td className={outlier ? "text-outlier" : "text-passing"}>
          {signed(diff)}
        </td>
        <td>
          <span className={`state-pill ${outlier ? "fail" : "pass"}`}>
            {VERDICT_LABEL[outlier ? "outlier" : "passing"]}
          </span>
        </td>
        <td>{REED_LABEL[pipe.reedStatus]}</td>
        <td className="cell-note">{pipe.serviceNote}</td>
        <td className="cell-time">{formatDateTime(pipe.measuredAt)}</td>
        <td className="cell-actions">
          <button className="link-btn" onClick={onStartRetest}>
            重测
          </button>
          <button className="link-btn" onClick={onToggleHistory}>
            历史({pipe.history.length})
          </button>
        </td>
      </tr>
      {retesting && (
        <tr className="retest-row">
          <td colSpan={9}>
            <RetestForm pipe={pipe} onCancel={onCancelRetest} onSubmit={onSubmitRetest} />
          </td>
        </tr>
      )}
      {expandedHistory && (
        <tr className="history-row">
          <td colSpan={9}>
            <HistoryTimeline pipe={pipe} />
          </td>
        </tr>
      )}
    </>
  );
}

function RetestForm({
  pipe,
  onCancel,
  onSubmit,
}: {
  pipe: PipeRecord;
  onCancel: () => void;
  onSubmit: (draft: RetestDraft) => void;
}) {
  const [cents, setCents] = useState(String(pipe.cents));
  const [pitchHz, setPitchHz] = useState(String(pipe.pitchHz));
  const [reedStatus, setReedStatus] = useState(pipe.reedStatus);
  const [serviceNote, setServiceNote] = useState(pipe.serviceNote);
  const [error, setError] = useState("");

  const handleSubmit = () => {
    const centsValue = Number(cents);
    const pitchValue = Number(pitchHz);
    if (!Number.isFinite(centsValue)) {
      setError("音分偏差需为数字");
      return;
    }
    if (!Number.isFinite(pitchValue) || pitchValue <= 0) {
      setError("实测音高需为正数（Hz）");
      return;
    }
    if (!serviceNote.trim()) {
      setError("请填写检修备注");
      return;
    }
    onSubmit({
      cents: Math.round(centsValue * 10) / 10,
      pitchHz: Math.round(pitchValue * 10) / 10,
      reedStatus,
      serviceNote: serviceNote.trim(),
    });
  };

  return (
    <div className="retest-form">
      <h4>重测 {pipe.code}（{pipe.noteName}）</h4>
      <div className="retest-grid">
        <label>
          <span>音分偏差</span>
          <input
            className="input"
            type="number"
            step="0.1"
            value={cents}
            onChange={(event) => setCents(event.target.value)}
          />
        </label>
        <label>
          <span>实测音高 Hz</span>
          <input
            className="input"
            type="number"
            step="0.1"
            min="0"
            value={pitchHz}
            onChange={(event) => setPitchHz(event.target.value)}
          />
        </label>
        <label>
          <span>簧片状态</span>
          <select
            className="input"
            value={reedStatus}
            onChange={(event) =>
              setReedStatus(event.target.value as PipeRecord["reedStatus"])
            }
          >
            {REED_OPTIONS.map((option) => (
              <option value={option} key={option}>
                {REED_LABEL[option]}
              </option>
            ))}
          </select>
        </label>
        <label className="retest-note">
          <span>检修备注</span>
          <input
            className="input"
            value={serviceNote}
            onChange={(event) => setServiceNote(event.target.value)}
          />
        </label>
      </div>
      <div className="retest-actions">
        {error && <span className="form-error">{error}</span>}
        <button onClick={onCancel}>取消</button>
        <button className="primary" onClick={handleSubmit}>
          提交重测并重算全组
        </button>
      </div>
      <p className="retest-tip">
        提交后按最新均值重算该组：原本通过的音管若被动离群只退回待校，历史结论保留。
      </p>
    </div>
  );
}

function HistoryTimeline({ pipe }: { pipe: PipeRecord }) {
  const entries = [...pipe.history].reverse();
  return (
    <div className="timeline">
      <h4>{pipe.code} 历史结论（只读，全程保留）</h4>
      <ol>
        {entries.map((entry, index) => (
          <li key={`${entry.at}-${index}`}>
            <div className="timeline-head">
              <span className={`timeline-kind kind-${entry.kind}`}>
                {KIND_LABEL[entry.kind]}
              </span>
              <time>{formatDateTime(entry.at)}</time>
            </div>
            <p>{entry.note}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

const KIND_LABEL: Record<string, string> = {
  created: "建档",
  retested: "重测",
  regressed: "被动退回待校",
  recovered: "恢复达标",
};
