// 描述一个文档分片，保留来源信息供回答引用。
export interface DocumentChunk {
  // 文档唯一标识。
  documentId: string;
  // 分片在文档中的顺序。
  index: number;
  // 分片正文。
  content: string;
  // 分片来源标题或文件名。
  source: string;
}

// 按段落和最大字符数切分纯文本。
export function chunkDocument(documentId: string, source: string, text: string, maxCharacters = 240): DocumentChunk[] {
  // 空文档不产生无意义分片。
  if (text.trim().length === 0) {
    return [];
  }

  // 先按空行拆成语义段落，再过滤空段落。
  const paragraphs = text.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
  // 保存最终分片。
  const chunks: DocumentChunk[] = [];
  // 保存当前正在构建的文本。
  let current = "";

  // 逐段构建不超过最大长度的分片。
  for (const paragraph of paragraphs) {
    // 如果加入下一段仍未超长，就继续合并。
    if (current.length === 0 || current.length + paragraph.length + 1 <= maxCharacters) {
      current = current.length === 0 ? paragraph : `${current}\n${paragraph}`;
      continue;
    }

    // 当前分片已满，先保存它。
    chunks.push({ documentId, index: chunks.length, content: current, source });
    // 从当前段落开始新的分片。
    current = paragraph;
  }

  // 保存循环结束后尚未提交的最后一个分片。
  if (current.length > 0) {
    chunks.push({ documentId, index: chunks.length, content: current, source });
  }
  // 返回带顺序和来源信息的分片。
  return chunks;
}
