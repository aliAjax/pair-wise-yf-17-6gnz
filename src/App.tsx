import { useState } from "react";
import "./styles.css";
import { Pipe } from "./domain/types";
import { OUTLIER_LIMIT } from "./domain/types";
import { useArchive } from "./ui/useArchive";
import { StopPanel } from "./ui/StopPanel";
import { ReportsView } from "./ui/ReportsView";
import { RetestDialog } from "./ui/RetestDialog";
import { fmtTime } from "./ui/format";

type Tab = "console" | "reports";

export default function App() {
  const { archive, retest, reset, getPipe, stats } = useArchive();
  const [tab, setTab] = useState<Tab>("console");
  const [targetPipeId, setTargetPipeId] = useState<string | null>(null);

  const target = targetPipeId ? getPipe(targetPipeId) : null;

  function handleReset() {
    if (window.confirm("确定恢复预置数据？当前浏览器存档（含全部重测与报告）将被清空。")) {
      reset();
      setTab("console");
      setTargetPipeId(null);
    }
  }

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <p className="eyebrow">管风琴维护 · 音栓组校音台</p>
          <h1>音栓组校音台</h1>
          <p className="rule-line">
            按音栓计算全组平均偏差；单管偏离均值超过 ±{OUTLIER_LIMIT}
            音分即判离群、整组回到待校。重测任一音管后按最新均值重算该组，曾通过的音管只退回待校、历史结论保留。
          </p>
        </div>
        <div className="archive-box">
          <span className="archive-dot" title="已保存在浏览器本地" />
          <div>
            <small>浏览器存档</small>
            <strong>{fmtTime(archive.updatedAt)}</strong>
          </div>
          <button className="ghost-btn" onClick={handleReset}>
            恢复预置
          </button>
        </div>
      </header>

      <section className="metrics">
        <article>
          <small>场馆 / 音栓</small>
          <strong>
            {archive.venues.length} / {stats.stops}
          </strong>
        </article>
        <article>
          <small>音管总数</small>
          <strong>{stats.pipes}</strong>
        </article>
        <article>
          <small>整组已校 / 待校</small>
          <strong>
            {stats.stopsPassed} / {stats.pendingStops}
          </strong>
        </article>
        <article>
          <small>当前离群音管</small>
          <strong className={stats.outliers > 0 ? "text-danger" : "text-ok"}>
            {stats.outliers}
          </strong>
        </article>
      </section>

      <nav className="tabs">
        <button
          className={tab === "console" ? "active" : ""}
          onClick={() => setTab("console")}
        >
          校音台（偏差表 · 音栓进度）
        </button>
        <button
          className={tab === "reports" ? "active" : ""}
          onClick={() => setTab("reports")}
        >
          单次维护报告
          {stats.reports > 0 && <span className="tab-count">{stats.reports}</span>}
        </button>
      </nav>

      {tab === "console" &&
        archive.venues.map((venue) => (
          <section key={venue.id} className="venue-block">
            <header className="venue-head">
              <h2>{venue.name}</h2>
              <span className="venue-kind">{venue.kind}</span>
              <span className="venue-count">{venue.stops.length} 个音栓</span>
            </header>
            <div className="stop-list">
              {venue.stops.map((s) => (
                <StopPanel
                  key={s.id}
                  stop={s}
                  onRetest={(p: Pipe) => setTargetPipeId(p.id)}
                />
              ))}
            </div>
          </section>
        ))}

      {tab === "reports" && <ReportsView reports={archive.reports} />}

      {target && (
        <RetestDialog
          pipe={target.pipe}
          stopName={target.stop.name}
          venueName={target.venue.name}
          onCancel={() => setTargetPipeId(null)}
          onSubmit={(payload) => {
            retest(target.pipe.id, payload);
            setTargetPipeId(null);
          }}
        />
      )}

      <footer className="page-foot">
        偏差表、音栓进度与单次维护报告共用同一份浏览器存档（localStorage：
        <code>organ-tuning-console:v1</code>）。
      </footer>
    </main>
  );
}
