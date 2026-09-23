// 界面展示辅助：文案、颜色标签与时间格式化
import type { PipeVerdict, ReedStatus, StopState, Stop } from "../types";
import { round1, signed } from "../domain/rules";

export const REED_LABEL: Record<ReedStatus, string> = {
  good: "良好",
  adjust: "需微调",
  replace: "待更换",
  na: "非簧管",
};

export const REED_OPTIONS: ReedStatus[] = ["good", "adjust", "replace", "na"];

export const VERDICT_LABEL: Record<PipeVerdict, string> = {
  passing: "达标",
  outlier: "离群",
};

export const STATE_LABEL: Record<StopState, string> = {
  pending: "待校",
  tuned: "已校",
};

export const STOP_KIND_LABEL: Record<Stop["kind"], string> = {
  reed: "簧片音栓",
  flue: "风管音栓",
  mixture: "混合音栓",
};

export function formatCents(value: number): string {
  return `${signed(round1(value))} 音分`;
}

export function formatHz(value: number): string {
  return `${round1(value).toFixed(1)} Hz`;
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
