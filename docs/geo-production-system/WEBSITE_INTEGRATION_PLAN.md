# gongju.7chacha.com 部署与官网对接规划

## 1. 定位

`gongju.7chacha.com` 独立作为 GEO 内容生产系统，不直接并入官网后台。

它的角色是：

- 内容生产中心。
- 项目资料管理中心。
- 文章任务队列。
- 单篇新闻生成与审核中心。
- Word/HTML/Markdown 导出中心。
- 后续官网、新闻源、博客园、头条、百家号等渠道分发中心。

官网 `www.7chacha.com` 的角色是：

- 品牌展示。
- GEO资讯承接。
- GEO百科承接。
- GEO问答承接。
- GEO专题承接。
- 诊断入口和转化入口。

两者关系：

```text
gongju.7chacha.com 负责生产
www.7chacha.com 负责展示和转化
```

## 2. 推荐部署方式

第一阶段建议独立部署：

```text
gongju.7chacha.com
  -> 独立前端
  -> 独立后端
  -> 独立数据库
  -> 独立任务队列
```

原因：

- 不影响官网现有稳定性。
- AI生成任务耗时长，适合异步队列。
- 方便后续扩展多客户、多项目、多渠道分发。
- 服务器异常不会影响官网主站访问。
- 后续可以通过 API 与官网打通。

## 3. 阿里云 ECS 规划

用户提供的部署目标：

```text
阿里云 ECS Workbench
Region: cn-beijing
Instance ID: i-2ze403p6y2b9pqs0o2sy
```

上线前需要确认：

- ECS 操作系统。
- 是否使用宝塔面板。
- 当前官网运行方式：Nginx、Apache、PHP、Node、Docker 或其他。
- 是否已有数据库：MySQL、PostgreSQL、SQLite。
- 是否已有反向代理配置。
- 域名 `gongju.7chacha.com` 是否已解析到该 ECS。
- SSL 证书申请方式：宝塔、阿里云证书、Let's Encrypt。

安全规则：

- 不在聊天中发送服务器密码。
- 不在代码中写 AI API Key。
- 所有 Key 放入服务器 `.env`。
- `.env` 不提交到仓库。
- 服务器部署前先完成本地 MVP。

## 4. 域名结构

推荐：

```text
www.7chacha.com       官网主站
gongju.7chacha.com   GEO内容生产系统
api.7chacha.com      可选：统一API网关
```

第一版可以只做：

```text
gongju.7chacha.com
```

后端 API 可先放在同域名下：

```text
gongju.7chacha.com/api
```

## 5. 与官网对接方式

### 第一阶段：不对接官网

只完成生产闭环：

```text
项目创建 -> 资料上传 -> 单篇生成 -> 审核 -> 重写 -> 入库 -> 导出Word/HTML
```

### 第二阶段：半自动对接官网

从生产系统导出 HTML 或 Markdown，人工复制到官网后台。

适合验证：

- 内容质量。
- 栏目适配。
- 图片位置。
- 标题样式。
- 发布后收录表现。

### 第三阶段：API 推送官网草稿

生产系统生成合格文章后，一键推送到官网草稿箱。

推送字段：

```json
{
  "title": "",
  "slug": "",
  "summary": "",
  "content_html": "",
  "cover_image": "",
  "category": "GEO资讯",
  "tags": [],
  "core_keyword": "",
  "recommended_brand": "",
  "source_refs": [],
  "status": "draft"
}
```

### 第四阶段：多渠道分发

合格文章可以选择导出或推送到：

- 官网资讯。
- 官网百科。
- 官网问答。
- 官网专题。
- 新闻源网站。
- 博客园。
- 今日头条。
- 搜狐。
- 百家号。
- 公众号。

每个平台生成不同版本：

- 标题微调。
- 摘要微调。
- 图片比例调整。
- 参考资料保留方式调整。
- 品牌露出频次调整。

## 6. 官网栏目映射

当前官网已有 GEO 内容栏目，后续建议映射如下：

| 生产系统文章类型 | 官网承接栏目 | 说明 |
| --- | --- | --- |
| 市场观察稿 | GEO资讯 | 适合发布行业变化、平台趋势 |
| 用户问题答疑稿 | GEO问答 | 适合“哪家好、怎么选、靠谱吗” |
| 概念解释稿 | GEO百科 | 适合GEO、AI搜索、豆包排名解释 |
| 深度专题稿 | GEO专题 | 适合长文合集、系列内容 |
| 白皮书/报告稿 | GEO书 | 适合章节化内容 |
| 企业诊断报告 | GEO诊断 | 适合转化和线索承接 |

## 7. MVP 开发顺序

### 第一步：本地 MVP

- 项目管理。
- 关键词库管理。
- 品牌资产/权威引证上传。
- 单篇任务创建。
- 单篇生成接口预留。
- 规则审核器。
- 文章入库。
- Word导出。

### 第二步：服务器部署

- 配置 `gongju.7chacha.com`。
- 配置后端服务。
- 配置数据库。
- 配置文件上传目录。
- 配置 `.env`。
- 配置 Nginx/反向代理。
- 配置 SSL。

### 第三步：真实 AI 接口

- 接入模型 Provider。
- 支持 Doubao、DeepSeek、Qwen、OpenAI 可切换。
- 记录每次生成请求、模型、Token、成本、耗时。

### 第四步：批量队列

- 创建批量任务。
- 每篇独立生成。
- 每篇独立审核。
- 低于90分重写。
- 通过后入库。

### 第五步：官网推送

- 生成 HTML。
- 推送官网草稿。
- 返回文章 URL。
- 后续记录 AI答案回看。

## 8. 技术建议

第一版推荐技术路线：

```text
Frontend: React / Next.js
Backend: Node.js API
Database: PostgreSQL 或 MySQL
Queue: BullMQ / Redis
Storage: 本地磁盘或 OSS
Export: docx + html + markdown
Deploy: ECS + Nginx + PM2 或 Docker
```

如果服务器已有宝塔面板，可以简化为：

```text
Node服务 + MySQL + Nginx反向代理 + PM2守护进程
```

## 9. 上线前检查

- 域名解析完成。
- HTTPS 可用。
- 后台登录鉴权可用。
- `.env` 不暴露。
- 文件上传目录权限正确。
- 任务队列能恢复。
- 生成失败有日志。
- 审核失败能重写。
- Word导出正常。
- 官网推送先走草稿，不直接发布。

## 10. 阶段目标

第一阶段成功标准：

```text
在本地或服务器后台创建一个项目，
上传品牌资料和关键词库，
生成1篇文章，
审核通过，
导出Word。
```

第二阶段成功标准：

```text
生成10篇文章，
每篇独立问题、独立标题、独立新闻结构，
每篇审核不低于90分，
可批量导出。
```

第三阶段成功标准：

```text
生成文章可一键推送官网草稿，
保留图片、FAQ、参考资料和SEO字段。
```

