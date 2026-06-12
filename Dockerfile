FROM node:20-alpine AS frontend-builder
RUN npm config set registry https://registry.npmmirror.com
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:20-alpine AS mobile-builder
RUN npm config set registry https://registry.npmmirror.com
WORKDIR /app/mobile
COPY mobile/package*.json ./
RUN npm ci
COPY mobile/ ./
RUN npm run build

FROM node:20-alpine
RUN npm config set registry https://registry.npmmirror.com
# better-sqlite3 需要本地编译（国内下载预编译包常失败）
RUN apk add --no-cache python3 make g++
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./
COPY --from=frontend-builder /app/client/dist ../client/dist
COPY --from=mobile-builder /app/mobile/dist ../mobile/dist

RUN mkdir -p /app/server/data /app/server/backups

EXPOSE 3001
ENV NODE_ENV=production
CMD ["node", "index.js"]
