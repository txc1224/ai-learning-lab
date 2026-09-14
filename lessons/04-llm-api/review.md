# 第 4 课复盘

## 我能解释什么

- [X] Provider 抽象
- [X] Prompt 与上下文
- [X] Mock 与真实模型的区别
- [X] Token 估算与 usage
- [X] 模型错误分类

## 我能独立实现什么

- [X] Mock Provider
- [X] 完整生成接口
- [X] Provider 错误类型
- [ ] 真实模型 smoke test
- [ ] 结构化输出校验

## 卡点与解决

- 卡点：真实供应商依赖 API Key 和网络。
- 解决：先用确定性 mock 完成架构与测试，再单独验证真实 Provider。

## 下一步

- 学习 SSE，把完整结果改为增量输出。
