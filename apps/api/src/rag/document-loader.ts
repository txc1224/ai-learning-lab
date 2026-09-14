// 定义本地文档输入结构。
export interface LocalDocument {
  // 文档唯一标识。
  id: string;
  // 文档来源名称。
  source: string;
  // 文档纯文本内容。
  text: string;
}

// 清洗本地文本，统一换行并去除首尾空白。
export function loadDocument(document: LocalDocument): LocalDocument {
  // 返回不可变的清洗结果。
  return { ...document, text: document.text.replace(/\r\n/g, "\n").trim() };
}
