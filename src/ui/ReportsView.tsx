// 界面模块 —— 单次维护报告列表
import {
  MaintenanceReport,
  PIPE_STATUS_TEXT,
  STOP_STATUS_TEXT,
} from "../domain/types";
import { fmtCent, fmtTime } from "./format";

interface Props {
  reports: MaintenanceReport[];
}

export function ReportsView({ reports }: Props) {
  if (reports.length === 0) {
    return (
      <section className="panel empty-panel">
        <h2>单次维护报告</h2>
        <p className="empty-text">
          还没有维护报告。在“校音台”页对任意音管执行一次「重测」，就会在此生成单次维护报告。
        </p>
      </section>
    );
  }

  return (
    <section className="panel reports-panel">
      <header className="heading">
        <div>
          <p className="eyebrow">浏览器存档 · 与偏差表、音栓进度共用</p>
          <h2>单次维护报告（{reports.length}）</h2>
        </div>
      </header>
      <div className="report-list">
        {reports.map((r) => (
          <article key={r.id} className="report-card">
            <header className="report-head">
              <div>
                <h3>
                  {r.venueName} · {r.stopName}
                </h3>
                <p className="report-target">
                  重测音管 <b>{r.pipeCode}</b>（{r.pitch}）
                </p>
              </div>
              <time>{fmtTime(r.at)}</time>
            </header>

            <div className="report-stat-row">
              <div className="report-stat">
                <small>组均值</small>
                <strong>
                  {fmtCent(r.meanBefore)} → {fmtCent(r.meanAfter)}
                </strong>
              </div>
              <div className="report-stat">
                <small>离群音管</small>
                <strong>
                  {r.outliersBefore} → {r.outliersAfter}
                </strong>
              </div>
              <div className="report-stat">
                <small>连带退回待校</small>
                <strong className={r.regressed > 0 ? "text-warn" : undefined}>
                  {r.regressed} 支
                </strong>
              </div>
              <div className="report-stat">
                <small>整组结论</small>
                <strong>
                  <span className={`badge status-stop-${r.groupBefore}`}>
                    {STOP_STATUS_TEXT[r.groupBefore]}
                  </span>{" "}
                  →{" "}
                  <span className={`badge status-stop-${r.groupAfter}`}>
                    {STOP_STATUS_TEXT[r.groupAfter]}
                  </span>
                </strong>
              </div>
            </div>

            <p className="report-summary">{r.summary}</p>

            <table className="report-table">
              <thead>
                <tr>
                  <th>音管</th>
                  <th>类型</th>
                  <th>偏差(前→后)</th>
                  <th>偏离新均值</th>
                  <th>状态(前→后)</th>
                </tr>
              </thead>
              <tbody>
                {r.pipes.map((p) => (
                  <tr
                    key={p.pipeId}
                    className={p.regress ? "row-regress" : undefined}
                  >
                    <td>
                      {p.pipeCode} <small>{p.pitch}</small>
                    </td>
                    <td>{p.retested ? "本次重测" : "连带重算"}</td>
                    <td className="cell-num">
                      {fmtCent(p.beforeDeviation)} → {fmtCent(p.afterDeviation)}
                    </td>
                    <td className="cell-num">{fmtCent(p.diff)}</td>
                    <td>
                      <span className={`badge status-${p.beforeStatus}`}>
                        {PIPE_STATUS_TEXT[p.beforeStatus]}
                      </span>{" "}
                      →{" "}
                      <span className={`badge status-${p.afterStatus}`}>
                        {PIPE_STATUS_TEXT[p.afterStatus]}
                      </span>
                      {p.regress && <em className="tag warn">退回待校</em>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        ))}
      </div>
    </section>
  );
}
