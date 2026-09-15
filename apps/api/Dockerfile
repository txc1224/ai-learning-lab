# 使用 Node 20 的轻量运行时作为教学基础镜像。
FROM node:20-alpine
# 在容器中创建应用工作目录。
WORKDIR /app
# 复制 monorepo 文件，真实生产应结合 lockfile 做更细的缓存分层。
COPY . .
# 安装 pnpm 并安装依赖。
RUN corepack enable && pnpm install --frozen-lockfile
# 构建 TypeScript workspace。
RUN pnpm build
# 暴露 API 端口。
EXPOSE 3001
# 启动 API 服务。
CMD ["pnpm", "--filter", "@ai-learning-lab/api", "dev"]
