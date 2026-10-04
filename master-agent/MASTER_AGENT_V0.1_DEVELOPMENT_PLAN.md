# Master Agent V0.1 — 总控 Agent 开发总纲

> 状态：Architecture Frozen / 开发准备
> 日期：2026-10-04
> 目标：先以 1 台电脑跑通“牛哥/TT → Master → Worker → Codex → 自动测试 → 返工/验收 → 结果回传”的完整闭环，同时底层按未来多 Worker、多电脑扩展设计。

## 1. 核心定位

Master Agent 不是 Codex 聊天窗口，而是长期运行的项目操作系统与调度层。

- 牛哥：目标、商业判断、最终决策
- TT：需求澄清、方案收敛、结构化任务
- Master Agent：项目识别、记忆、调度、验收、回传
- Worker Agent：运行在执行电脑上的节点
- Codex：Coding Worker，被 Worker/Adapter 调用

## 2. 冻结架构

```text
牛哥 / TT / 本地入口
        ↓
   Master Agent
        ↓
 Project Router
        ↓
 Task / Memory / Decision
        ↓
 Worker Registry + Scheduler
        ↓
 Worker 01 ... Worker N
        ↓
 CodingAgentAdapter
        ↓
 Codex / Future Coding Agents
        ↓
 Test → Verify → Git → Result
```

V0.1 实际只连接 1 个 Worker，但禁止把执行逻辑写死在 Master 本机。底层必须使用 Master → Worker → Codex 结构。

## 3. 多项目隔离

每个项目必须拥有独立：
- Project ID
- Workspace
- Git Repository
- Memory
- Task Queue
- Decision Log
- Test / Acceptance Rules
- Coding Agent Context

项目默认完全隔离。任何任务执行前必须确认 Project ID；无法可靠识别时进入 NEED_CLARIFICATION，禁止猜测后执行。

## 4. 长期记忆

每个项目建议维护：

```text
memory/
├── PROJECT_OVERVIEW.md
├── CURRENT_STATE.md
├── DECISIONS.md
├── TODO.md
├── PROBLEMS.md
└── sessions/
```

原则：
Raw History → Session Summary → Incremental Structured Memory

禁止反复重写全部历史导致总结失真。

## 5. 任务协议

每个任务至少包含：
- task_id
- project_id
- goal
- context
- existing_assets
- constraints
- acceptance_criteria
- permission_scope
- priority
- status

## 6. 开发前强制审计

Codex 禁止收到任务后立即重写代码。

开工前必须输出：
1. 现有项目已经有什么？
2. 哪些可以直接复用或改造复用？
3. 哪些能力确实不存在，才允许新开发？

分类：REUSE / MODIFY / BUILD。

## 7. Coding Agent Adapter

Master 不直接绑定 Codex UI。建立 CodingAgentAdapter。

V0.1：Codex Adapter。
未来可增加 Claude Code、Cursor Agent 或其他 Coding Agent，而不推翻 Master。

## 8. 状态机

主流程：
NEW → ROUTING → AUDITING → READY → RUNNING → TESTING → VERIFYING → COMPLETED

异常：
- TEST_FAILED → REWORK → RUNNING
- NEED_DECISION
- NEED_CLARIFICATION
- BLOCKED

Codex 声称“完成”不等于任务完成；只有自动测试和 Master 验收通过才可 COMPLETED。

## 9. Git / GitHub

建议：
读取仓库 → 创建任务分支 → 修改 → 自动测试 → PASS → Commit → 记录 Commit SHA → 更新项目记忆。

未经测试不得直接视为完成。

## 10. 安全边界

V0.1 只开放：
- 指定项目目录
- 指定仓库
- 指定命令
- 指定开发工具
- 指定测试环境

默认禁止访问私人文件、非项目目录、密码、浏览器敏感信息和系统关键目录。

## 11. V0.1 开发顺序

1. TASK-001：项目骨架 + Project ID + 多项目隔离
2. TASK-002：Project Memory
3. TASK-003：Task Protocol + Task Queue
4. TASK-004：Worker Registry + 单 Worker 通信
5. TASK-005：Codex Adapter
6. TASK-006：本地执行 Worker
7. TASK-007：自动测试 + 状态机 + 自动返工
8. TASK-008：Git/GitHub 管理
9. TASK-009：结果回传 + 简单控制面板
10. TASK-010：PPT Auto Video 端到端真实验收

## 12. 第一阶段明确不做

- 漂亮桌面 UI
- 六台电脑同时接入
- 真正电话系统
- 复杂实时语音
- 大量 Agent
- 大规模云架构
- 自动商业决策

先跑通闭环，再扩展。

## 13. V0.1 最终验收

以 PPT Auto Video 为真实项目：

牛哥提出真实开发目标后，系统应完成：
识别项目 → 加载记忆 → 审计仓库/半成品 → 生成任务 → Worker 调 Codex → 修改 → 测试 → 失败自动返工 → 通过验收 → Git Commit → 更新记忆 → 返回结果。

成功标准：

**牛哥不再充当 TT 与 Codex 之间的人工中间人。Master Agent 能把真实任务推进到 COMPLETED、NEED_DECISION 或 BLOCKED 中的明确状态。**

## 14. 后续扩展

V0.2：第二台电脑 + 多 Worker 调度。
随后：语音入口、手机远程调度、多电脑协作、能力标签与更完整的 Agent OS。
