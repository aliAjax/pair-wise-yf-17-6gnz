// 数据模块 —— 唯一标识生成
let seq = 0;

export function makeId(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq.toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}
