FROM node:22-alpine AS build-stage

WORKDIR /app

# 启用 corepack，安装与本地一致的 pnpm 10 大版本（自动获取最新小版本）
RUN corepack enable && corepack prepare pnpm@10 --activate

# 设置镜像源加速依赖下载
RUN npm config set registry https://registry.npmmirror.com

# 先复制依赖描述文件，充分利用 Docker 缓存
COPY .npmrc package.json pnpm-lock.yaml ./

# 严格按照 lockfile 安装依赖
RUN pnpm install --frozen-lockfile

# 复制其余源码
COPY . .
RUN NODE_OPTIONS=--max-old-space-size=8192 pnpm build

# 生产阶段：轻量 Nginx 提供静态服务
FROM nginx:stable-alpine AS production-stage

# 复制自定义 Nginx 配置（覆盖默认配置）
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 复制构建产物
COPY --from=build-stage /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]