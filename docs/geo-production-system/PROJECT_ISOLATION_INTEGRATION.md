# geoskill 内容生产项目隔离接入

本变更仅涉及 geoskill 本地项目代码。没有访问或改动 geo.7chacha.com，也没有重写文章生成提示词、六段生成工序或文章结构。

## 当前实现

- `server/project-scope.mjs` 解析临时身份协议，校验服务端项目注册表，以 AsyncLocalStorage 保留请求及后台生成任务的项目归属。
- 每个账户项目独立存于 `outputs/projects/{projectId}/data/app-state.json`；图库、导出分别存于同项目 `uploads`、`exports`。元组格式资料由外层项目命名空间拥有；品牌、任务、文章对象在写入时补入 `projectId`、`agentId`、`ownerUserId`（当前写入人）。
- `/api/state` 保留原格式，但状态键只能访问内容生产白名单，不允许指定任意命名空间。请求体不能改变外层账户项目。
- 生成之前从当前项目的持久化品牌、核心词、关键词库、知识库、榜单候选和图库重组资料包，保留原文章计划及写作选项。后台生成过程不随浏览器切换账户而改变归属。
- `/api/projects/summary` 返回当前身份可见的项目注册信息及品牌、文章、任务数量。代理仅看自己 `agentId` 的项目，总管理员看全局，项目账户只看自己的项目。
- 文件读写均限定在当前项目目录，跨项目图库引用、文章配图、任务状态查询及导出请求被拒绝。导出按当前项目存储的文章 ID 读取正文，不信任客户端附带的正文；Word 内嵌已有本地图片，避免下载后的图片依赖登录态。
- 前端缓存按 `userId:projectId` 命名，旧异步响应和旧组件写入不会进入新账户；成品库严格限定当前品牌，预览、编辑、删除、下载沿用相同范围；编辑器可将当前品牌图库图片插入光标处。

## 高优先级删除修复

旧删除逻辑根据核心词、品牌名在正文中的出现做模糊匹配，会误删其他品牌的关键词库、任务和文章。现在仅比较行首品牌归属或对象 `project` 字段，保留其他品牌中同名核心词或提及被删除品牌的文章。

删除前从服务器读取当前项目相关资料，避免用户未打开资料页时用空浏览器缓存覆盖其他品牌资料。无品牌归属的四列旧疑问词不会自动分配给同核心词品牌，也不会被这种删除操作猜测性删除。

## 主线程与 auth 接入点

1. **替换 `resolveCurrentUser(req)`**：目前按照主线程约定读 `x-geo-user-id`、`x-geo-role`、`x-geo-agent-id`、`x-geo-project-id`。正式 auth 必须从已验证 session/JWT 得到用户及固定账户权限，不能将浏览器自报头作为可信身份。代理/总管理员选择的目标项目另经 `resolveProjectScope` 注册表校验。不要改写 scope 存储包装函数。
2. **替换 `listProjectAccounts()` 来源或写注册表**：临时读取 `outputs/data/project-accounts.json` 数组，每项至少有 `projectId`、`agentId`、`projectName`、`status`、`createdAt`、`updatedAt`。禁止由普通账户任意写入归属关系。状态停用与用户成员资格由 auth 负责校验。
3. **前端身份桥**：在 App 初始化前设置 `window.__geoIdentity = { userId, role, agentId, projectId }`。切换账户/项目后发送 `window.dispatchEvent(new Event('geo:identity-changed'))`；登出先删除该字段再发事件。后续可将 `src/project-scope.ts` 的请求头改为 session 凭据，保持缓存命名与重挂机制。
4. **管理后台**：消费 `/api/projects/summary` 绘制代理按项目汇总、总后台全局汇总；选定项目后再进入内容页面。本分支不重复制作登录与账户管理 UI。
5. **合并文件冲突**：优先整合 `server/geo-api-server.mjs` 的入口包装、状态读写、图库/导出和生成入口；`src/main.tsx` 主要冲突点为 `apiJson`、`useStoredState`、`Projects.deleteProject`、`LibraryPage`、根 `ProjectApp`。生成提示词正文没有变化。

## 兼容模式与上线限制

按主线程要求，**没有任何身份头时默认继续使用 legacy 模式**，读取原 `outputs/data`、`outputs/uploads`、`outputs/exports`。账户项目永远不继承这些旧目录。旧浏览器缓存不再自动回填服务器；旧服务器数据保留。

正式 auth 上线必须设置 `GEO_ALLOW_LEGACY_ANONYMOUS=false`，并替换临时头身份解析。当前分支是项目隔离接入层，不能单独宣称完成生产级登录安全。旧资料如需迁移，必须先明确其账户项目归属，执行专门迁移；不自动按品牌名或核心词猜测归属。

JSON 状态仍是单进程文件存储；同项目多窗口同时提交整表可能覆盖彼此编辑，后续数据库版本应加入版本号或行级更新。本次未改变该原有并发模型。

## 验证

```text
npm ci
npm run build
npm run test:project-isolation
```

后端测试启动临时目录中的独立 API，不读取真实项目资料或调用配置中的真实模型；覆盖 A/B 同品牌同核心词隔离、对象归属、防越权文件/配图/导出、后台任务归属、代理/全局汇总、缺身份拒绝及资料包来源。

浏览器测试使用本机 Chrome（可通过 `GEO_TEST_BROWSER=msedge` 切 Edge）、临时 Vite 和拦截的测试 API，真实点击查看、编辑、插图、保存、下载、删除和切换账户；确认相同核心词的其他品牌任务/文章仍保留。它验证前端交互；服务端权限由前一组真实 HTTP 测试验证。未消耗真实模型额度或执行真实发文。
