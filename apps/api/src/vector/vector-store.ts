// 描述向量存储中的一条记录。
export interface VectorRecord {
  // 记录唯一标识。
  id: string;
  // 原始文本。
  content: string;
  // 文档来源。
  source: string;
  // 已计算的向量。
  vector: number[];
}

// 描述向量检索命中。
export interface VectorHit extends VectorRecord {
  // 余弦相似度分数。
  score: number;
}

// 定义可替换的向量存储边界。
export interface VectorStore {
  // 写入一批向量记录。
  upsert(records: VectorRecord[]): Promise<void>;
  // 按向量相似度取 top-k。
  search(vector: number[], limit: number): Promise<VectorHit[]>;
}

// 内存向量库，用于没有 pgvector 时的本地教学。
export class InMemoryVectorStore implements VectorStore {
  // 保存所有向量记录。
  private readonly records: VectorRecord[] = [];

  // 写入或替换同 ID 记录。
  async upsert(records: VectorRecord[]): Promise<void> {
    for (const record of records) {
      const index = this.records.findIndex((item) => item.id === record.id);
      if (index === -1) this.records.push(record);
      else this.records[index] = record;
    }
  }

  // 计算相似度并返回排序结果。
  async search(vector: number[], limit: number): Promise<VectorHit[]> {
    return this.records
      .map((record) => ({ ...record, score: cosine(vector, record.vector) }))
      .sort((left, right) => right.score - left.score)
      .slice(0, limit);
  }
}

// 计算余弦相似度，并拒绝不同维度向量。
function cosine(left: number[], right: number[]): number {
  if (left.length !== right.length) throw new Error("vector dimensions must match");
  const dot = left.reduce((sum, value, index) => sum + value * right[index], 0);
  const leftNorm = Math.sqrt(left.reduce((sum, value) => sum + value ** 2, 0));
  const rightNorm = Math.sqrt(right.reduce((sum, value) => sum + value ** 2, 0));
  return leftNorm && rightNorm ? dot / (leftNorm * rightNorm) : 0;
}
