// 界面模块 · 单次维护报告：填写当次维护信息，归档时快照各音栓判定，共用浏览器存档
import { useMemo, useState } from "react";
import { useArchive } from "../data/store";
import { STATE_LABEL, formatCents, formatDateTime } from "./format";

export function MaintenanceReports() {
  const { archive, addReport } = useArchive();
  const [venueId, setVenueId] = useState(archive.venues[0]?.id ?? "");
  const [technician, setTechnician] = useState("");
  const [temperature, setTemperature] = useState("21");
  const [humidity, setHumidity] = useState("50");
  const [scope, setScope] = useState("");
  const [findings, setFindings] = useState("");
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(
    archive.reports[0]?.id ?? null
  );

  const preview = useMemo(
    () =>
      archive.stops
        .filter((stop) => stop.venueId === venueId)
        .map((stop) => ({
          stop,
          pipes: archive.pipes.filter((pipe) => pipe.stopId === stop.id),
        })),
    [archive.stops, archive.pipes, venueId]
  );

  const handleArchive = () => {
    const temp = Number(temperature);
    const hum = Number(humidity);
    if (!venueId) return setError("请选择场馆");
    if (!technician.trim()) return setError("请填写维护人");
    if (!Number.isFinite(temp)) return setError("温度需为数字");
    if (!Number.isFinite(hum) || hum < 0 || hum > 100)
      return setError("湿度需为 0–100 的数字");
    if (!scope.trim()) return setError("请填写维护范围");
    if (!findings.trim()) return setError("请填写处理与结论");

    const report = addReport({
      venueId,
      technician: technician.trim(),
      temperature: Math.round(temp * 10) / 10,
      humidity: Math.round(hum),
      scope: scope.trim(),
      findings: findings.trim(),
    });
    setOpenId(report.id);
    setScope("");
    setFindings("");
    setError("");
  };

  return (
    <div className="reports-layout">
      <section className="panel">
        <div className="heading">
          <div>
            <p>单次维护报告</p>
            <h2>新建并归档</h2>
          </div>
        </div>

        <div className="report-grid">
          <label>
            <span>场馆</span>
            <select
              className="input"
              value={venueId}
              onChange={(event) => setVenueId(event.target.value)}
            >
              {archive.venues.map((venue) => (
                <option value={venue.id} key={venue.id}>
                  {venue.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>维护人</span>
            <input
              className="input"
              value={technician}
              placeholder="如：周调音师"
              onChange={(event) => setTechnician(event.target.value)}
            />
          </label>
          <label>
            <span>温度 ℃</span>
            <input
              className="input"
              type="number"
              step="0.1"
              value={temperature}
              onChange={(event) => setTemperature(event.target.value)}
            />
          </label>
          <label>
            <span>湿度 %RH</span>
            <input
              className="input"
              type="number"
              step="1"
              value={humidity}
              onChange={(event) => setHumidity(event.target.value)}
            />
          </label>
        </div>

        <label className="block-field">
          <span>本次维护范围</span>
          <textarea
            className="input"
            rows={2}
            value={scope}
            placeholder="如：Bourdon 16' 低音区复测，重点排查 BD-10 塞盖。"
            onChange={(event) => setScope(event.target.value)}
          />
        </label>
        <label className="block-field">
          <span>处理情况与结论</span>
          <textarea
            className="input"
            rows={3}
            value={findings}
            placeholder="记录更换簧片、复检结果与遗留问题。"
            onChange={(event) => setFindings(event.target.value)}
          />
        </label>

        <div className="snapshot-preview">
          <p className="snapshot-title">归档时将随报告固化以下音栓快照（按当前偏差表判定）：</p>
          <ul>
            {preview.map(({ stop, pipes }) => {
              const mean =
                pipes.length === 0
                  ? 0
                  : pipes.reduce((sum, pipe) => sum + pipe.cents, 0) /
                    pipes.length;
              const outlierCount = pipes.filter(
                (pipe) => Math.abs(pipe.cents - mean) > 3
              ).length;
              return (
                <li key={stop.id}>
                  <span>{stop.name}</span>
                  <span>均值 {formatCents(mean)}</span>
                  <span
                    className={
                      outlierCount > 0 ? "text-outlier" : "text-passing"
                    }
                  >
                    离群 {outlierCount}/{pipes.length}
                  </span>
                  <span>
                    {outlierCount > 0
                      ? STATE_LABEL.pending
                      : STATE_LABEL.tuned}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="retest-actions">
          {error && <span className="form-error">{error}</span>}
          <button className="primary" onClick={handleArchive}>
            归档报告
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>浏览器存档</p>
            <h2>历史维护报告（{archive.reports.length}）</h2>
          </div>
        </div>
        <div className="report-list">
          {archive.reports.length === 0 && (
            <p className="empty-hint">暂无报告，归档后将与偏差表、音栓进度共用同一份存档。</p>
          )}
          {archive.reports.map((report) => {
            const venue = archive.venues.find((v) => v.id === report.venueId);
            const open = openId === report.id;
            return (
              <article className="report-card" key={report.id}>
                <button
                  className="report-card-head"
                  onClick={() => setOpenId(open ? null : report.id)}
                >
                  <div>
                    <strong>{venue?.name}</strong>
                    <span>{formatDateTime(report.at)} · {report.technician}</span>
                  </div>
                  <span className="toggle">{open ? "收起" : "展开"}</span>
                </button>
                {open && (
                  <div className="report-body">
                    <div className="report-env">
                      <span>温度 {report.temperature}℃</span>
                      <span>湿度 {report.humidity}%RH</span>
                    </div>
                    <h5>维护范围</h5>
                    <p>{report.scope}</p>
                    <h5>处理情况与结论</h5>
                    <p>{report.findings}</p>
                    <h5>音栓快照</h5>
                    <table className="snapshot-table">
                      <thead>
                        <tr>
                          <th>音栓</th>
                          <th>状态</th>
                          <th>全组均值</th>
                          <th>离群/总数</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.snapshots.map((snap) => (
                          <tr key={snap.stopId}>
                            <td>{snap.stopName}</td>
                            <td>
                              <span
                                className={`state-pill ${
                                  snap.state === "tuned" ? "pass" : "fail"
                                }`}
                              >
                                {STATE_LABEL[snap.state]}
                              </span>
                            </td>
                            <td>{formatCents(snap.mean)}</td>
                            <td>
                              {snap.outliers}/{snap.total}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
