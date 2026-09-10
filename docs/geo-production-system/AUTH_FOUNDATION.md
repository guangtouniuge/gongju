# geoskill 账号与权限底座

## 范围与运行

账号模块接入现有 React + Node 服务，不调用旧系统，不调整提示词、内容生成、评分或入库规则。所有业务 API 默认需要登录，无绕过开关。身份由服务端 Cookie 会话决定，客户端不能提交角色来获得权限。

首次启动前在项目 `.env.local` 配置以下变量（将示例占位值替换为自己的值）：

```dotenv
GEO_ADMIN_USERNAME=admin
GEO_ADMIN_PASSWORD=replace-with-a-strong-password
GEO_APP_ORIGIN=http://localhost:5173
GEO_COOKIE_SECURE=false
```

`npm ci` 安装后，在两个终端分别运行 `npm run dev:api` 和 `npm run dev`。访问 Vite 输出的 `/gongju/` 地址。如果浏览器使用 `127.0.0.1`、不同端口或线上域名，必须同步修改 `GEO_APP_ORIGIN` 为浏览器的完整 origin（不带路径和尾部斜杠）。线上使用同域 `/api` 反向代理、HTTPS，并设置 `GEO_COOKIE_SECURE=true`。不配置跨域凭据访问。

只有不存在任何总后台管理员时才读取初始化账号变量。重启不会覆盖已有密码。首次登录后可移除 `GEO_ADMIN_PASSWORD`，后续在界面修改密码。没有初始化管理员时，注册仍只产生待审核操作员。

## 存储模型

`outputs/auth/accounts.json`（可通过 `GEO_AUTH_DATA_DIR` 覆盖目录）：

| 实体 | 字段 |
| --- | --- |
| User | id、username（小写唯一）、displayName、passwordHash、role、status、workspaceId、createdAt |
| Session | tokenHash、userId、expiresAt |
| 顶层 | version=1、users、sessions |

密码为随机盐 + scrypt 哈希；会话为256位随机令牌，只存 SHA-256 摘要。服务端文件以临时文件写入后重命名，返回接口始终剔除密码哈希。密码长度10～128字符。会话有效期8小时，不滑动续期；退出撤销当前会话，改密、账号状态或角色变更撤销该账号全部会话。`pending`、`active`、`disabled` 分别表示待审核、正常、停用。

业务文件：`outputs/workspaces/<workspaceId>/data/app-state.json`、`uploads/`、`exports/`。后台任务查询也绑定工作空间。通过 AsyncLocalStorage 将请求身份传播到现有生成队列和状态读写，不修改单篇生成工作流。前端缓存键为 `account:<workspaceId>:geo.*`，不读取旧全局缓存；HttpOnly 会话令牌不写 localStorage。

这是单 Node 进程的本地持久化 MVP。多进程或多实例部署前需要迁移数据库、共享会话存储和共享限流。建议数据库拆为 users、workspaces、sessions、workspace_memberships、project_memberships；用户名唯一索引、会话过期索引、成员复合唯一索引。当前并未实现这套数据库迁移。

## 角色边界

| 角色 | 账号管理 | 业务能力 |
| --- | --- | --- |
| super_admin 总后台管理员 | 全部账号；可创建四类角色；默认创建独立工作空间，也可指定现有空间编号 | 本空间内容、发布；全局模型配置状态与模型测试 |
| agent 代理商 | 本空间项目管理员、项目操作员；创建账号自动归属本空间 | 本空间内容与发布 |
| project_admin 项目管理员 | 本空间项目操作员；创建账号自动归属本空间 | 本空间内容与发布 |
| project_operator 项目操作员 | 无 | 本空间内容操作；不可发布、测试模型或读取配置状态 |

总管理员也不能修改自己的角色/状态；必须保留至少一个有效总管理员。公开注册忽略客户端传入的角色、状态与工作空间，创建独立空间的待审核操作员。可以由总管理员审核后使用；团队成员应由管理员在账号管理中创建。

**当前授权单位是工作空间，不是单个品牌项目。** 同一空间成员共享该空间的品牌，品牌之间仍沿用现有品牌归属筛选。需要“一个操作员只能看某几个品牌”时，主线程须增加稳定 projectId 和 project_memberships，并将全量 `/api/state` 拆分为按资源校验的接口。当前角色名不代表已实现品牌级 ACL，不能把互不信任客户放入同一空间。总管理员默认不能跨空间直接读取业务正文，仅可管理账号。

## API

统一响应 `{ok:true,...}` 或 `{ok:false,error}`。变更请求必须为 JSON；校验 Origin；返回401/403/409/429等明确状态。

| 方法与路由 | 输入/结果 |
| --- | --- |
| POST /api/auth/register | username、password、可选displayName；返回待审核账号 |
| POST /api/auth/login | username、password；Set-Cookie + user（含permissions） |
| POST /api/auth/logout | 空对象；撤销当前会话、清Cookie |
| GET /api/auth/me | 当前user及permissions |
| POST /api/auth/password | currentPassword、newPassword；成功后重新登录 |
| GET /api/admin/users | 返回角色范围内账号 |
| POST /api/admin/users | username、password、role；总管理员可选workspaceId |
| POST /api/admin/users/update | id、可选role、可选status；即时撤销会话 |

登录、注册、验证原密码共享每来源IP每15分钟30次的内存限流，不信任客户端转发IP头。反向代理后的生产流量应配置代理侧限流，并设计可信代理IP解析。

## 前端与合并点

- `src/auth.tsx`：登录/注册、当前账号栏、改密、用户列表、创建、角色调整、审核启停；`AuthGate` 在 `/me` 成功前不挂载生产界面。焦点变化及每60秒重新验证会话，业务401也退回登录。
- `src/auth.css`：账号相关独立样式。
- `src/main.tsx`：仅包裹 AuthGate、替换缓存适配器并处理401；和主线程改动合并时保留这些三处接入，不覆盖业务页面改动。
- `server/auth.mjs`：独立身份、权限和会话模块。
- `server/geo-api-server.mjs`：API入口认证、请求体限制、状态/图库/导出目录隔离、任务命名空间、配置与发布权限检查。合并时保留主线程正文生成逻辑。
- `.gitignore`：排除账号及空间数据；`package.json`：增加 `test:auth` 并纳入 `npm test`。

旧 `outputs/data/app-state.json`、图库、导出以及浏览器全局缓存不会自动归属首个登录者，也不会被删除。主线程需确认其真实所属工作空间，再执行一次性数据迁移；图库记录中的绝对路径也必须同步迁移。不要直接向新注册账号回填旧数据。

## 验证与后续

`npm test` 运行构建与真实HTTP集成测试，使用系统临时目录、随机端口，不访问配置好的模型或发布服务。覆盖匿名拦截、Cookie属性、注册提权、待审核、重复用户名、越权创建/修改、状态启停、工作空间状态与文件隔离、改密、退出、会话撤销、存储无明文密码/令牌、Origin拦截。

尚未实现：邮箱/手机验证、忘记密码、邀请令牌、多因素认证、审计日志、数据库迁移、品牌级成员权限、多实例部署。内容生成需要已有品牌资料与模型配置，此次不以真实付费生成验证账号功能。

已额外使用本机 Chrome 完成按钮验证：管理员登录 → 创建操作员 → 退出 → 操作员登录（无账号管理按钮）→ 修改密码 → 新密码重新登录，全程无页面脚本错误。登录成功重新载入应用，业务请求携带工作空间一致性标识，旧标签页在账号切换后不能将旧空间缓存写入新空间。
