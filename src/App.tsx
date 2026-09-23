// 界面模块 · 外壳：页头指标、三个视图切换
import { useMemo, useState } from "react";
import "./styles.css";
import { ArchiveProvider, useArchive } from "./data/store";
import { ProgressBoard } from "./ui/ProgressBoard";
import { DeviationTable } from "./ui/DeviationTable";
import { MaintenanceReports } from "./ui/MaintenanceReports";

type Tab = "progress" | "deviation" | "reports";

const TABS: { key: Tab; label: string }[] = [
  { key: "progress", label: "音栓进度" },
  { key: "deviation", label: "偏差表" },
  { key: "reports", label: "维护报告" },
];

function Console() {
  const { archive, judge, reset } = useArchive();
  const [tab, setTab] = useState<Tab>("progress");
  const [selectedStop, setSelectedStop] = useState(
    archive.stops[2]?.id ?? archive.stops[0]?.id ?? ""
  );

  const metrics = useMemo(() => {
    const judgements = archive.stops.map((stop) => judge(stop.id));
    const tuned = judgements.filter((j) => j.state === "tuned").length;
    const outliers = judgements.reduce(
      (sum, j) => sum + j.outlierIds.length,
      0
    );
    const venues = new Set(archive.stops.map((stop) => stop.venueId)).size;
    return {
      venues,
      stops: archive.stops.length,
      pipes: archive.pipes.length,
      tuned,
      outliers,
      reports: archive.reports.length,
    };
  }, [archive, judge]);

  const handleReset = () => {
    if (window.confirm("将清空当前浏览器存档并恢复两场馆三音栓九支管的预置数据，确定？")) {
      reset();
      setTab("progress");
      setSelectedStop("s3");
    }
  };

  const pickStop = (stopId: string) => {
    setSelectedStop(stopId);
    setTab("deviation");
  };

  return (
    <main className="app">
      <header className="hero">
        <div className="hero-row">
          <p>hxyfront-62005 · 管风琴维护 · Port 62005</p>
          <button className="ghost-btn" onClick={handleReset}>
            恢复预置数据
          </button>
        </div>
        <h1>音栓组校音台</h1>
        <span>
          按音栓计算全组平均偏差：单管偏离均值超过 ±3 音分即判离群，整组回到待校。
          重测任一音管后按最新均值重算该组，原本通过的音管若被动离群只退回待校，历史结论全程保留。
        </span>
      </header>

      <section className="metrics">
        <article>
          <small>场馆 / 音栓</small>
          <strong>
            {metrics.venues} / {metrics.stops}
          </strong>
        </article>
        <article>
          <small>受管音管</small>
          <strong>{metrics.pipes}</strong>
        </article>
        <article>
          <small>已校音栓</small>
          <strong className={metrics.tuned === metrics.stops ? "metric-good" : ""}>
            {metrics.tuned}/{metrics.stops}
          </strong>
        </article>
        <article>
          <small>离群音管</small>
          <strong className={metrics.outliers > 0 ? "metric-bad" : "metric-good"}>
            {metrics.outliers}
          </strong>
        </article>
      </section>

      <nav className="tabs">
        {TABS.map((item) => (
          <button
            key={item.key}
            className={tab === item.key ? "tab active" : "tab"}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === "progress" && <ProgressBoard onPickStop={pickStop} />}
      {tab === "deviation" && (
        <DeviationTable stopId={selectedStop} onChangeStop={setSelectedStop} />
      )}
      {tab === "reports" && <MaintenanceReports />}

      <footer className="footer">
        偏差表、音栓进度与单次维护报告共用浏览器 localStorage 存档 ·
        判定规则（domain）、存档数据（data）、页面（ui）分为三个业务模块
      </footer>
    </main>
  );
}

function App() {
  return (
    <ArchiveProvider>
      <Console />
    </ArchiveProvider>
  );
}

export default App;
