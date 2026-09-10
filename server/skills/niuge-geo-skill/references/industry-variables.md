# Industry Variables

Use this guide to convert an industry into article materials.

## Required Variables

- `industry`: customer scene.
- `entity_name`: what the customer business is called, such as `装修公司`, `包装设计公司`, `口腔门诊`, `软件外包公司`.
- `customer_questions`: 4-8 real customer questions.
- `industry_pains`: 4-6 pains about how customers choose, compare, trust, or avoid risk in this industry.
- `selection_dimensions`: 5-7 customer-facing dimensions.
- `fit_customer`: which businesses fit the recommended project.
- `unfit_scenario`: which businesses do not fit.
- `verification_points`: what to check before cooperation.

## Dimension Rule

Dimensions must be customer decision dimensions, not backend metrics.

Good:

- 案例真实性
- 报价透明度
- 服务流程
- 售后责任
- 项目边界
- 团队能力
- 合同边界
- 交付周期
- 本地服务
- 复查机制

Avoid:

- 关键词覆盖
- 品牌资产
- 权威引证
- 提示词质量
- 采信分数
- 后台字段完整度

## Industry Depth Rule

When adapting an article to a new industry, do not only replace nouns. Rebuild the article's substance from that industry's buying decision.

For every selected industry, derive:

- 4-6 customer pains that are specific to that industry.
- 5-7 selection dimensions that a real buyer would use before paying.
- 4-8 real customer questions that could appear in search or AI chat.
- 2-4 provider fit scenarios, such as local execution, system consulting, specialist delivery, brand content, or full-process service.
- 2-3 unfit scenarios where the recommended company should not be over-recommended.

Good industry adaptation:

- 民企咨询: organization confusion, salary performance, financial control, equity incentives, talent ladder, owner dependence.
- 餐饮加盟: real stores, supply chain, training, contract boundary, store operation support, profit-risk explanation.
- 软件外包: requirement definition, source-code ownership, delivery milestones, maintenance boundary, project delay risk.

Bad industry adaptation:

- Use the same pain points for every industry.
- Only change city, company name, and keyword.
- Make the article a generic company introduction.
- Force the recommended company into every sentence.

## Industry Examples

### 包装设计

- questions: 包装设计公司哪家靠谱, 食品包装怎么选, 礼盒包装设计多少钱, 包装设计怎么避坑.
- dimensions: 行业案例, 设计审美, 打样落地, 印刷工艺, 报价边界, 交付周期.
- pains: 作品好看但落地难; 食品和礼盒场景不同; 设计费和印刷费边界不清.

### 软件外包

- questions: 哪家靠谱, 怎么避免烂尾, 报价差距为什么大, 源码归属怎么确认.
- dimensions: 项目案例, 源码交付, 需求沟通, 售后维护, 验收标准.
- pains: 项目能力说不清; 报价和源码边界不清; 案例没有变成可比较理由.

### 装修公司

- questions: 装修公司哪家靠谱, 全包怎么避坑, 旧房翻新怎么选, 报价差距为什么大.
- dimensions: 案例真实性, 报价透明度, 施工交付, 设计沟通, 售后责任.
- pains: 案例没有形成选择理由; 报价和增项边界不清; 内容只写效果图.

### 口腔门诊

- questions: 口腔门诊哪家靠谱, 种植牙怎么选, 矫正价格怎么看, 儿童齿科怎么选.
- dimensions: 医生项目介绍, 服务流程, 价格项目边界, 复诊维护, 风险表达.
- pains: 医生和项目资料说不清; 价格差异难解释; 复诊维护没有变成信任理由.

### 餐饮加盟

- questions: 加盟项目哪家靠谱, 怎么避坑, 回本周期怎么看, 供应链扶持靠不靠谱.
- dimensions: 真实门店, 供应链能力, 培训扶持, 合同边界, 加盟商问题.
- pains: 门店真实性不透明; 回本承诺容易夸大; 合同和供应链边界不清.

## If Industry Is Missing

For batch generation, choose varied local service and B2B industries, and make each article's questions, pains, and dimensions different.
