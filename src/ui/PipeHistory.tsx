// 界面模块 —— 音管历史结论（历史结论保留展示）
import { PIPE_STATUS_TEXT, Pipe } from "../domain/types";
import { fmtCent, fmtTime } from "./format";

interface Props {
  pipe: Pipe;
}

export function PipeHistory({ pipe }: Props) {
  const entries = [...pipe.history].reverse();
  return (
    <div className="history">
      <h4>历史结论（保留 {pipe.history.length} 条）</h4>
      <ol>
        {entries.map((h) => (
          <li key={h.id}>
            <div className="history-line">
              <span className={`badge tiny status-${h.verdict}`}>
                {PIPE_STATUS_TEXT[h.verdict]}
              </span>
              <time>{fmtTime(h.at)}</time>
              {h.retested && <em className="tag">本次实测</em>}
              {h.regress && <em className="tag warn">连带退回待校</em>}
            </div>
            <p>
              偏差 {fmtCent(h.deviation)} · 组均值 {fmtCent(h.mean)} · 偏离{" "}
              {fmtCent(h.diff)} · 簧片：{h.reed}
            </p>
            {h.note && <p className="history-note">备注：{h.note}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}
