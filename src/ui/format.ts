// 界面模块 —— 展示格式化
import { Cent } from "../domain/types";
import { round2 } from "../domain/tuning";

export function fmtCent(n: Cent | null | undefined): string {
  if (n === null || n === undefined) return "—";
  const v = round2(n);
  return `${v > 0 ? "+" : ""}${v}`;
}

export function fmtTime(iso: string | null): string {
  if (!iso) return "尚未判定";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}
