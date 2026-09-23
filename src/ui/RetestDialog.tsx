// 界面模块 —— 重测对话框
import { useEffect, useRef, useState } from "react";
import { Pipe, REED_STATES } from "../domain/types";
import { RetestPayload } from "./useArchive";

interface Props {
  pipe: Pipe;
  stopName: string;
  venueName: string;
  onCancel: () => void;
  onSubmit: (payload: RetestPayload) => void;
}

export function RetestDialog({
  pipe,
  stopName,
  venueName,
  onCancel,
  onSubmit,
}: Props) {
  const [deviation, setDeviation] = useState(String(pipe.deviation));
  const [reed, setReed] = useState(pipe.reed);
  const [note, setNote] = useState(pipe.note);
  const [error, setError] = useState<string | null>(null);
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstField.current?.focus();
  }, []);

  function submit() {
    const value = Number(deviation);
    if (!Number.isFinite(value)) {
      setError("音分偏差需为数字，例如 -2.5 或 3");
      return;
    }
    if (value < -100 || value > 100) {
      setError("音分偏差应在 ±100 以内");
      return;
    }
    onSubmit({
      deviation: Math.round(value * 100) / 100,
      reed,
      note: note.trim(),
    });
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={`重测 ${pipe.code}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-head">
          <h2>
            重测音管 {pipe.code} <small>{pipe.pitch}</small>
          </h2>
          <button className="icon-btn" onClick={onCancel} aria-label="关闭">
            ×
          </button>
        </header>
        <p className="modal-sub">
          {venueName} · {stopName} · 上一次偏差{" "}
          <b>{pipe.deviation > 0 ? "+" : ""}{pipe.deviation}</b> 音分
        </p>

        <div className="modal-grid">
          <label>
            <span>音分偏差（实测）</span>
            <input
              ref={firstField}
              value={deviation}
              onChange={(e) => {
                setDeviation(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              inputMode="decimal"
              placeholder="如 -1.5"
            />
          </label>
          <label>
            <span>簧片状态</span>
            <select
              value={reed}
              onChange={(e) => setReed(e.target.value as Pipe["reed"])}
            >
              {REED_STATES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="full-label">
          <span>检修备注</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="本次重测的检修说明"
          />
        </label>

        {error && <p className="form-error">{error}</p>}
        <p className="form-hint">
          保存后将按最新均值重算整个音栓组；曾通过的音管若因此离群，仅退回待校，历史结论保留。
        </p>

        <footer className="modal-foot">
          <button onClick={onCancel}>取消</button>
          <button className="primary" onClick={submit}>
            保存重测并重算
          </button>
        </footer>
      </div>
    </div>
  );
}
