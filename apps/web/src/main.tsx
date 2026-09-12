// 导入 React 根节点渲染方法。
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// 导入页面样式，让学习者能直观看到应用状态。
import "./style.css";

// 定义首页组件，后续课程会逐步替换为对话工作台。
function App() {
  return (
    <main className="page">
      <p className="eyebrow">AI LEARNING LAB</p>
      <h1>从全栈基础开始构建 AI 应用</h1>
      <p className="description">先理解链路，再实现项目。当前是第 0 课：认识 AI 应用的完整请求流程。</p>
      <a href="http://localhost:3001/health" target="_blank" rel="noreferrer">打开 API 健康检查</a>
    </main>
  );
}

// 找到 HTML 中的根节点，并以严格模式挂载应用。
createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
