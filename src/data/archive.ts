// 浏览器存档：偏差表、音栓进度与单次维护报告共用同一份 localStorage
import type { Archive } from "../types";
import { buildSeed } from "./seed";

const STORAGE_KEY = "hxyfront-62005-archive-v1";

export function loadArchive(): Archive {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildSeed();
    const parsed = JSON.parse(raw) as Archive;
    if (parsed.version !== 1) return buildSeed();
    return parsed;
  } catch {
    return buildSeed();
  }
}

export function saveArchive(archive: Archive): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(archive));
  } catch {
    // 隐私模式或配额不足时静默保留内存态
  }
}

export function resetArchive(): Archive {
  const seed = buildSeed();
  saveArchive(seed);
  return seed;
}
