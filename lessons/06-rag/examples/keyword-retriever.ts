// 导入课程中的分片类型。
import type { DocumentChunk } from "./chunker.js";

// 描述一个检索命中及其简单评分。
export interface RetrievalHit {
  // 命中的分片。
  chunk: DocumentChunk;
  // 关键词命中次数。
  score: number;
}

// 将查询和正文转换成可比较的关键词集合。
function tokenize(text: string): string[] {
  // 课程示例使用简单空白和标点切分，不代表中文生产分词效果。
  return text.toLowerCase().split(/[\s,，。！？!?.、:：;；()（）]+/).filter((token) => token.length > 0);
}

// 使用关键词重叠数量进行本地检索。
export function retrieveByKeyword(chunks: DocumentChunk[], query: string, limit = 3): RetrievalHit[] {
  // 预先计算查询关键词，避免重复处理。
  const queryTokens = new Set(tokenize(query));
  // 对每个分片计算关键词交集分数。
  return chunks
    .map((chunk) => {
      // 计算正文中不同查询词的命中数。
      const score = tokenize(chunk.content).filter((token) => queryTokens.has(token)).length;
      // 返回分片和分数。
      return { chunk, score };
    })
    // 无命中分片不应该进入上下文。
    .filter((hit) => hit.score > 0)
    // 分数优先，index 保证相同分数时顺序稳定。
    .sort((left, right) => right.score - left.score || left.chunk.index - right.chunk.index)
    // 限制上下文大小，避免把所有文档塞给模型。
    .slice(0, limit);
}

// 将检索命中转换成带引用标记的上下文。
export function buildContext(hits: RetrievalHit[]): string {
  // 无命中时明确返回空上下文。
  if (hits.length === 0) {
    return "";
  }
  // 每个分片携带来源和索引，方便回答引用。
  return hits.map((hit) => `[${hit.chunk.source}#${hit.chunk.index}]\n${hit.chunk.content}`).join("\n\n");
}
