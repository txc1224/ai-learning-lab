// 导入检索命中结构。
import type { RetrievalHit } from "./retriever.js";

// 定义对外引用结构。
export interface Citation {
  // 来源名称。
  source: string;
  // 来源中的分片位置。
  chunkIndex: number;
  // 检索分数，帮助调试召回结果。
  score: number;
}

// 将检索结果转为去重后的引用列表。
export function buildCitations(hits: RetrievalHit[]): Citation[] {
  // 用来源和分片序号组成稳定去重键。
  const seen = new Set<string>();
  // 只保留第一次出现的来源。
  return hits.flatMap((hit) => {
    const key = `${hit.chunk.source}#${hit.chunk.index}`;
    if (seen.has(key)) {
      return [];
    }
    seen.add(key);
    return [{ source: hit.chunk.source, chunkIndex: hit.chunk.index, score: hit.score }];
  });
}
