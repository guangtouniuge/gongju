# AI接口、成本与任务稳定性规则

## 1. 目标

系统需要支持多模型生成、审核和重写，同时控制成本、失败率和任务可恢复性。

## 2. Provider 设计

每个模型接入统一接口：

```ts
interface AIProvider {
  name: string
  generate(input): Promise<GenerationResult>
  audit(input): Promise<AuditResult>
  available(): Promise<boolean>
}
```

第一版预留：

- MockProvider：开发测试。
- DoubaoProvider：内容生成或审核。
- DeepSeekProvider：逻辑推理和审核。
- QwenProvider：中文内容生成。
- OpenAIProvider：复杂规划和审核。

## 3. 模型分工

建议：

- 规划：强推理模型。
- 正文生成：中文长文稳定模型。
- 审核：另一个模型或同模型不同提示词。
- 重写：正文生成模型。
- 标题优化：快速模型。

不要让同一个模型在同一次调用里完成全部事情。

## 4. 成本记录

每次调用记录：

```json
{
  "project_id": "",
  "article_id": "",
  "provider": "",
  "model": "",
  "task_type": "plan|generate|audit|rewrite|export",
  "input_tokens": 0,
  "output_tokens": 0,
  "cost": 0,
  "duration_ms": 0,
  "status": "success|failed",
  "error": ""
}
```

## 5. 预算控制

项目可设置：

- 总预算。
- 单篇预算。
- 最大重写次数。
- 最大生成篇数。
- 最大并发数。

触发预算上限：

- 暂停批量任务。
- 保留已通过文章。
- 提示人工确认。

## 6. 失败重试

失败类型：

- 模型超时。
- API限流。
- 余额不足。
- 返回空内容。
- 返回格式错误。
- 内容不合格。

处理：

- 超时：重试 1-2 次。
- 限流：延迟重试。
- 余额不足：暂停任务。
- 格式错误：重新请求结构化输出。
- 内容不合格：走重写流程。

## 7. 状态恢复

每篇任务必须持久化：

- 当前状态。
- 当前计划卡。
- 最新草稿。
- 审核报告。
- 重写次数。
- 错误信息。

系统重启后：

- 已通过文章不重跑。
- 审核中断文章重新审核。
- 生成中断文章重新生成当前版本。
- 失败文章保留失败原因。

## 8. Prompt版本管理

每次生成记录：

- 系统提示词版本。
- 文章计划卡版本。
- 审核规则版本。
- 模型名称。

当规则升级后：

- 新文章使用新版本。
- 旧文章不自动改变。
- 需要时可批量标记重新审核。

