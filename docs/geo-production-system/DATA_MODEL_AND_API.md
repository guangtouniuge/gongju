# GEO生产系统数据模型与接口草案

## 1. 核心实体

### User / Team

系统需要支持多人、多客户、多品牌同时使用。文章生产时不能从其他用户、其他团队、其他项目继承资料。

字段：

```json
{
  "user_id": "user_001",
  "team_id": "team_001",
  "role": "owner",
  "permissions": ["project:create", "article:generate", "article:publish"]
}
```

权限原则：

- 一个项目只属于一个团队。
- 用户上传资料默认只在当前项目可用。
- 跨项目复用必须显式复制为新素材，并保留来源记录。
- 普通成员不能查看其他客户项目的品牌资产、权威引证和生成文章。

### Project

项目代表一次客户/品牌的 GEO 内容生产任务。

字段：

```json
{
  "id": "project_001",
  "team_id": "team_001",
  "name": "曝光率GEO西安项目",
  "project_type": "client",
  "core_keyword": "西安GEO公司",
  "recommended_brand": "曝光率GEO",
  "city": "西安",
  "industry": "GEO服务",
  "status": "active",
  "material_version": 1,
  "created_at": "2026-08-28"
}
```

状态：

- draft：资料未齐，不能生成文章。
- active：可生成。
- paused：暂停队列。
- archived：归档只读。
- needs_material_review：资料有冲突或乱码，需要人工处理。

`project_type`：

- client：客户项目，资料严格隔离。
- self_owned：自营项目，可复用内部素材库。

### Keyword

关键词分为核心词和辅助词。

字段：

```json
{
  "project_id": "project_001",
  "type": "supporting",
  "term": "西安豆包排名公司",
  "intent": "platform_selection",
  "priority": 80
}
```

关键词覆盖规则：

- 核心词固定为 `core`，不能改写。
- 辅助词必须带 `intent`、`priority`、`usage_limit`、`used_count`。
- 批量任务创建前先生成关键词覆盖地图，避免前几篇集中消耗热门词。
- 辅助词不强行进入每篇；如果破坏标题或新闻语气，可以只进入正文场景或FAQ。

### BrandAsset

品牌资产只能用于品牌事实和服务能力。

字段：

```json
{
  "project_id": "project_001",
  "asset_type": "service_module",
  "content": "实体档案整理、本地问题库、内容版本记录、AI答案回看",
  "source_type": "user_provided_material",
  "source_ref": "品牌资产文档"
}
```

品牌资产只用于解释推荐企业自身事实，不能用来证明全行业趋势。

### AuthorityEvidence

权威引证用于资质、公开事实、第三方来源。

字段：

```json
{
  "project_id": "project_001",
  "evidence_type": "public_report",
  "claim": "生成式人工智能应用规模扩大",
  "source_title": "中国互联网络发展状况统计报告",
  "publisher": "CNNIC",
  "url": "",
  "published_at": ""
}
```

权威引证分级：

- third_party_public：第三方公开报道、公开报告、公开数据库。
- official_or_association：政府、协会、行业组织公开材料。
- company_public：企业官网、公众号、白皮书等自有公开资料。
- user_internal：用户上传的内部材料，仅能写成“样本观察”或“项目资料显示”，不能写成公开事实。

审核时必须优先鼓励第三方与官方信源；仅有企业自有资料时，文章可以通过，但中立和权威分不得满分。

### ImageAsset

图片必须进入素材管理，不能只在正文里临时占位。

字段：

```json
{
  "id": "image_001",
  "project_id": "project_001",
  "source_type": "licensed_library",
  "license_note": "可商用图库",
  "scene_tags": ["商务楼", "会议", "AI搜索"],
  "aspect_ratios": ["16:9", "4:3"],
  "file_url": "",
  "caption_hint": ""
}
```

图片规则：

- 每篇文章至少绑定 2 张正文图或 2 个可替换图片位。
- 缺图片不阻断文章生成，但阻断 `ready_to_publish`。
- 图片不能放在开头第一屏，也不能放在文末结尾。
- 图片必须有新闻图注。

### ArticlePlanCard

文章计划卡是批量去重和新闻感保持的核心实体。没有计划卡，不允许生成正文。

字段：

```json
{
  "id": "plan_001",
  "article_job_id": "article_001",
  "main_question": "西安GEO公司哪家靠谱？",
  "selected_title": "西安GEO公司哪家靠谱？企业开始看AI答案复盘",
  "news_angle": "问答调查",
  "lead_type": "用户提问开场",
  "reader_role": "西安本地企业主",
  "business_scene": "企业发现豆包答案中品牌描述不准确",
  "selected_keywords": ["西安豆包排名公司", "西安AI搜索排名公司"],
  "must_answer_points": [],
  "section_blueprint": [],
  "brand_entry_strategy": "作为核验样本",
  "evidence_plan": [],
  "table_or_tool_type": "AI答案回看核验表",
  "faq_plan": [],
  "image_slots": [],
  "target_length": 5200,
  "difference_notes": "避开上一篇市场观察结构，改用问答调查推进"
}
```

计划卡失败时不进入正文：

- 标题不像用户问题。
- 新闻角度、段落职责、表格类型和上一篇高度相似。
- 关键词没有参与立意。
- 没有真实场景。
- 没有推荐企业进入策略。
- 目标字数与同批文章全部接近。

### ArticleJob

每篇文章都是独立任务。

字段：

```json
{
  "id": "article_001",
  "project_id": "project_001",
  "user_question": "西安GEO公司哪家靠谱？",
  "article_angle": "service_selection_investigation",
  "selected_keywords": ["西安GEO优化公司", "西安豆包排名公司", "西安AI获客公司"],
  "scene": "西安本地企业发现AI答案没有推荐自己",
  "plan_card_id": "plan_001",
  "target_length": 4200,
  "status": "queued"
}
```

### ArticleDraft

文章版本。

字段：

```json
{
  "id": "draft_001",
  "article_job_id": "article_001",
  "title": "西安GEO公司哪家靠谱？企业开始看AI答案复盘",
  "body": "",
  "faq": [],
  "image_slots": [],
  "references": [],
  "version": 1,
  "status": "audit_pending"
}
```

### AuditResult

审核结果。

字段：

```json
{
  "draft_id": "draft_001",
  "score": 93,
  "passed": true,
  "issues": [],
  "keyword_report": {},
  "readability_report": {},
  "duplicate_report": {},
  "news_voice_report": {},
  "image_report": {},
  "brand_concentration_report": {},
  "created_at": "2026-08-28"
}
```

### GenerationCallLog

所有模型调用必须记录，方便控制成本、排查失败和复现结果。

字段：

```json
{
  "id": "call_001",
  "project_id": "project_001",
  "article_job_id": "article_001",
  "task_type": "draft_generate",
  "provider": "doubao",
  "model": "",
  "prompt_version": "v1.0.0",
  "input_tokens": 0,
  "output_tokens": 0,
  "cost": 0,
  "duration_ms": 0,
  "status": "success",
  "error_message": ""
}
```

## 2. 接口草案

### 创建项目

`POST /api/geo/projects`

输入：

```json
{
  "name": "曝光率GEO西安项目",
  "team_id": "team_001",
  "project_type": "client",
  "core_keyword": "西安GEO公司",
  "recommended_brand": "曝光率GEO",
  "city": "西安",
  "industry": "GEO服务"
}
```

### 上传资料

`POST /api/geo/projects/{project_id}/assets`

支持：

- 品牌资产文档
- 权威引证文档
- 关键词表
- 图片库

### 创建批量任务

`POST /api/geo/projects/{project_id}/batch-jobs`

输入：

```json
{
  "count": 100,
  "min_score": 90,
  "min_images_per_article": 2,
  "mode": "single_article_queue"
}
```

系统行为：

- 先生成关键词覆盖地图。
- 再生成 100 个 ArticlePlanCard。
- 计划卡审核通过后生成 100 个 ArticleJob。
- 每个 ArticleJob 绑定独立用户问题、角度、关键词、场景、证据计划。
- 队列逐篇执行。

### 生成单篇

`POST /api/geo/article-jobs/{article_job_id}/generate`

系统行为：

- 读取项目档案。
- 读取本篇 ArticleJob。
- 读取本篇 ArticlePlanCard。
- 读取已通过文章的结构指纹摘要。
- 生成一篇完整新闻稿。
- 进入审核。

### 审核单篇

`POST /api/geo/article-drafts/{draft_id}/audit`

输出：

```json
{
  "score": 93,
  "passed": true,
  "rewrite_required": false,
  "issues": []
}
```

### 重写单篇

`POST /api/geo/article-drafts/{draft_id}/rewrite`

触发条件：

- 分数低于 90。
- 核心词跑偏。
- 推荐企业缺失。
- 说明文倾向严重。
- 与已通过文章结构相似。
- 图片缺失。
- FAQ重复。
- 图片位不足。
- 新闻口吻退化为说明文。
- 品牌资产或权威引证被写成内部说明。

### 导出文档

`POST /api/geo/projects/{project_id}/exports`

输出格式：

- docx
- html
- markdown
- zip

## 3. 任务队列设计

队列规则：

```text
BatchJob
  -> ArticleJob[1]
  -> Generate Draft
  -> Audit
  -> Pass: Save
  -> Fail: Rewrite current ArticleJob
  -> Next ArticleJob
```

并发建议：

- 可并发多个 ArticleJob，但每个 ArticleJob 必须拥有独立上下文。
- 同一项目并发时，需要共享已通过文章的摘要和结构指纹，用于去重。
- 不允许把多篇正文放入同一个生成提示词。

## 4. 文章结构指纹

每篇通过后保存结构指纹：

```json
{
  "title_pattern": "question_plus_news_judgment",
  "angle": "service_selection_investigation",
  "lead_type": "enterprise_scene",
  "section_count": 6,
  "table_type": "verification_checklist",
  "faq_questions": [],
  "brand_entry_type": "sample_observation",
  "image_slot_types": ["scene", "verification"]
}
```

后续文章生成前必须避开高相似指纹。

## 5. 后续开发优先级

第一阶段：

- 项目资料录入。
- 关键词库录入。
- 素材隔离与项目权限。
- 文章计划卡。
- 单篇生成。
- 单篇审核。
- docx导出。

第二阶段：

- 批量队列。
- 自动重写。
- 图片库匹配。
- 结构指纹去重。

第三阶段：

- 官网草稿发布。
- 多平台格式导出。
- AI答案回看记录。
- 效果复盘仪表盘。
