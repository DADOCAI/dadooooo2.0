## 我将做的事

* 保持你现有弹窗UI不变，只改内部调用逻辑。

* 新增云端函数文件 `/api/send-magic-link.ts`（适配 Vercel），用于稳定调用 Supabase 发送登录链接。

* 前端优先调用 `VITE_MAGIC_LINK_ENDPOINT`（指向你的云端函数），未配置时再走本地后端，最后才直连 Supabase。

* 本地后端增加可选代理支持（自动读取 `HTTPS_PROXY`/`HTTP_PROXY`），尽量提升本机直连成功率。

## 改动点

1. 新增：`/api/send-magic-link.ts`（云端函数）

* 读取云端环境变量 `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`

* 调用 `auth.signInWithOtp`

1. 修改：`src/contexts/AuthContext.tsx`

* `sendMagicLink(email)` 优先调用 `import.meta.env.VITE_MAGIC_LINK_ENDPOINT`

* 打印详细成功/错误日志，失败时自动回退本地后端→前端直连

1. 修改：`server/index.js`

* 启动时读取 `.env.local`（已修复路径）

* 若存在 `HTTPS_PROXY`/`HTTP_PROXY`，自动启用代理（用 `global-agent`）

* 打印 Supabase 配置摘要

## 你要配置的两处

* Vercel 环境变量：`SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`

* 前端环境变量：`VITE_MAGIC_LINK_ENDPOINT=https://你的vercel域名/api/send-magic-link`（本地也可以先指向云端）

## 验证

* 弹窗输入邮箱→点击“发送登录链接”→Console 出现 `response 200`→收邮件→点链接返回→顶部显示邮箱前缀与“退出登录”

## 交付

* 完整代码改动

* 使用/排错说明（包含常见错误与处理）

## 时间

* 30–60 分钟内完成改动与说明。

