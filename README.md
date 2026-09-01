# GEO Content Production System

这是 GEO 新闻内容生产系统的开发规划仓库。

系统目标不是继续维护写作 skill，而是开发一套可部署到服务器的内容生产工作流：

- 创建客户项目
- 录入核心词、关键词库、推荐企业
- 上传品牌资产与权威引证
- 生成文章计划卡
- 单篇隔离生成新闻稿
- 自动审核，不低于 90 分入库
- 支持 Word、HTML、官网草稿和多平台分发

核心原则：

> 批量任务是队列，写作永远是单篇新闻生产。

主要文档：

- `docs/geo-production-system/README.md`
- `docs/geo-production-system/V1_LOCKED_PRODUCT_RULES.md`
- `docs/geo-production-system/UI_AND_SAAS_CONSTRAINTS.md`
- `docs/geo-production-system/DEFAULT_BAN_AND_AUDIT_RULES.md`
- `docs/geo-production-system/RULE_STACK_AND_DRY_RUN.md`
- `docs/geo-production-system/WORKFLOW_CONSTRAINTS.md`
- `docs/geo-production-system/PROCESS_DETAIL_RULES.md`
- `docs/geo-production-system/DATA_MODEL_AND_API.md`
- `docs/geo-production-system/UI_PRODUCT_PLAN.md`
- `docs/geo-production-system/IMPLEMENTATION_ACCEPTANCE_CHECKLIST.md`

Agents:

- `.cursor/agents/geo-production-orchestrator.md`
- `.cursor/agents/geo-article-quality-auditor.md`

## 本地运行

```bash
npm install
npm run dev
```

打开：

```text
http://127.0.0.1:5173/
```

## 测试

```bash
npm test
```

当前 1.0 基础版包含：

- Codex/GPT 风格三栏工作台
- 项目资料概览
- 关键词库展示
- 文章计划卡
- 单篇任务队列
- 文章预览
- 右侧质量审核面板
- GitHub Actions 构建测试
