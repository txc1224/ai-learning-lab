// 定义向量生成器接口，真实 Embedding Provider 可以替换它。
export interface Embedder {
  // 向量维度。
  readonly dimensions: number;
  // 将文本转换成向量。
  embed(text: string): Promise<number[]>;
}

// 一个确定性的字符哈希向量，仅用于教学和测试。
export class FakeEmbedder implements Embedder {
  // 固定维度，方便 VectorStore 做校验。
  readonly dimensions = 8;

  // 为每个字符累积到固定维度，再归一化到 0～1。
  async embed(text: string): Promise<number[]> {
    const vector = Array.from({ length: this.dimensions }, () => 0);
    for (const [index, character] of [...text].entries()) {
      vector[index % this.dimensions] += character.codePointAt(0) ?? 0;
    }
    const max = Math.max(...vector, 1);
    return vector.map((value) => value / max);
  }
}

// 计算两个同维度向量的余弦相似度。
export function cosineSimilarity(left: number[], right: number[]): number {
  if (left.length !== right.length) throw new Error("vector dimensions must match");
  const dot = left.reduce((sum, value, index) => sum + value * right[index], 0);
  const leftNorm = Math.sqrt(left.reduce((sum, value) => sum + value ** 2, 0));
  const rightNorm = Math.sqrt(right.reduce((sum, value) => sum + value ** 2, 0));
  if (leftNorm === 0 || rightNorm === 0) return 0;
  return dot / (leftNorm * rightNorm);
}
