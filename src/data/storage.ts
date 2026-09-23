// 数据模块 —— 浏览器存档
// 偏差表、音栓进度、单次维护报告共用同一份 localStorage 存档。

import { Archive } from "../domain/types";
import { buildSeedArchive } from "./seed";

export const STORAGE_KEY = "organ-tuning-console:v1";

export function loadArchive(): Archive {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildSeedArchive();
    const parsed = JSON.parse(raw) as Archive;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.venues)) {
      return buildSeedArchive();
    }
    return parsed;
  } catch {
    return buildSeedArchive();
  }
}

export function saveArchive(archive: Archive): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(archive));
  } catch {
    // 隐私模式或配额受限时静默失败，界面仍可用当前内存数据工作
  }
}

export function resetArchive(): Archive {
  const fresh = buildSeedArchive();
  saveArchive(fresh);
  return fresh;
}
