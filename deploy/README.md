# GEO内容生产系统服务器部署说明

## 目录

- `dist/`：前端静态文件，绑定 `gongju.7chacha.com`。
- `server/geo-api-server.mjs`：文章生成、5118拓词、图库上传、任务状态和导出接口。
- `package.json`：Node 运行依赖和启动脚本。
- `.env.production.example`：服务器环境变量模板，不包含真实密钥。
- `nginx/gongju.7chacha.com.conf`：Nginx 站点配置模板。
- `scripts/start-api.sh`：API 启动脚本。

## 上线顺序

1. 安装 Node.js 20+、Nginx、PM2。
2. 上传本压缩包到服务器，例如 `/www/wwwroot/gongju.7chacha.com`。
3. 解压后执行 `npm install --omit=dev`。
4. 复制 `.env.production.example` 为 `.env`，填入真实 API 信息。
5. 用 PM2 启动 API：`pm2 start server/geo-api-server.mjs --name geo-content-api`。
6. 配置 Nginx，把域名根目录指向 `dist/`，并把 `/api/` 反向代理到 `127.0.0.1:8787`。
7. 重载 Nginx 后访问 `https://gongju.7chacha.com/`。

## 验收

- 页面能打开。
- `/api/config/status` 可返回模型、5118、小青蛙配置状态。
- 能添加品牌、核心词、关键词库、品牌知识库、图库。
- 能创建生成任务，并按系统工作流调用 API 生成文章。
