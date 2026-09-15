# 使用 Node 20 作为前端构建环境。
FROM node:20-alpine AS build
# 设置 monorepo 工作目录。
WORKDIR /app
# 复制源码和 workspace 配置。
COPY . .
# 安装 pnpm 并构建前端。
RUN corepack enable && pnpm install --frozen-lockfile && pnpm --filter @ai-learning-lab/web build

# 使用 Nginx 提供静态文件。
FROM nginx:alpine
# 复制 Vite 构建产物。
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
# 暴露静态服务端口。
EXPOSE 80
