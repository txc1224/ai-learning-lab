// 导入 PostgreSQL 连接池，复用数据库连接并控制并发连接数。
import { Pool, type PoolClient, type QueryResultRow } from "pg";

// 创建一个延迟初始化的数据库连接池。
export const pool = new Pool({
  // 从环境变量读取连接地址，默认匹配 docker-compose 的宿主机端口。
  connectionString: process.env.DATABASE_URL ?? "postgresql://ai_learning_lab:ai_learning_lab@127.0.0.1:5433/ai_learning_lab",
  // 单个课程示例只需要少量连接，避免本地资源浪费。
  max: Number(process.env.DB_POOL_MAX ?? 5),
});

// 执行一条带参数的 SQL，防止把用户输入直接拼接进 SQL。
export async function query<T extends QueryResultRow>(text: string, values: unknown[] = []): Promise<T[]> {
  // 让连接池自动借出和归还连接。
  const result = await pool.query<T>(text, values);
  // 只返回数据行，隐藏 pg 的内部结果结构。
  return result.rows;
}

// 在一个显式事务中执行多步数据库操作。
export async function withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  // 从连接池借出一个连接，保证事务内使用同一个连接。
  const client = await pool.connect();

  try {
    // 开始事务。
    await client.query("BEGIN");
    // 执行业务传入的多步数据库操作。
    const result = await work(client);
    // 所有操作成功后提交事务。
    await client.query("COMMIT");
    // 返回业务操作结果。
    return result;
  } catch (error) {
    // 任一步骤失败都回滚，避免只写入半条数据。
    await client.query("ROLLBACK");
    // 保留原始错误，让上层决定如何记录和转换。
    throw error;
  } finally {
    // 无论成功还是失败，都必须归还连接。
    client.release();
  }
}

// 在进程退出时关闭连接池，避免留下未释放的连接。
export async function closePool(): Promise<void> {
  // 等待所有连接完成关闭。
  await pool.end();
}
