## 目标
- 保留现有弹窗 UI（邮箱输入框 + 发送登录链接），但将“发送登录链接”改为调用云端接口，绕过本机网络拦截。
- 完成前端与云端接口联调，Supabase Auth 正常投递邮件并自动登录。

## 改动内容
### 1. 新增云端接口（Vercel Serverless Function）
- 位置：项目根 `/api/send-magic-link.ts`
- 行为：
  - 读取 `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY` 环境变量
  - 使用 `@supabase/supabase-js` 调用 `auth.signInWithOtp({ email, options: { emailRedirectTo } })`
  - 返回 `{ ok: true }` 或 `{ error, detail }`
- 说明：Vercel 可直接识别根目录 `/api/*` 为函数；使用服务端密钥，不暴露到前端。

### 2. 前端逻辑保持 UI 不变，仅切换调用地址
- `AuthContext.sendMagicLink(email)`：
  - 优先调用 `VITE_MAGIC_LINK_ENDPOINT`（例如 `https://你的vercel域名/api/send-magic-link`）
  - 若未配置则回退到本地 `/api/auth/send-magic-link` 再到 Supabase 直连
- 保留弹窗提示文案与布局；登录状态变化仍通过 `getSession()` + `onAuthStateChange` 更新顶部显示邮箱前缀与“退出登录”。

### 3. 配置说明（我将整理并发你）
- 在 Vercel 项目设置环境变量：
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- 在前端 `.env.local` 或 Vercel 前端环境变量：
  - `VITE_MAGIC_LINK_ENDPOINT=https://你的vercel域名/api/send-magic-link`
  - 保留 `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_ANON_KEY`
- Supabase 控制台 → Auth → URL Configuration：
  - Site URL 同时包含 `http://localhost:3000` 与你的线上域名

## 验证流程
1. 部署函数到 Vercel；在 Vercel Dashboard 查看函数日志。
2. 本地或线上：打开登录弹窗，输入邮箱，点击“发送登录链接”。
3. 预期：
   - 前端 Console：`send-magic-link response { status: 200, body: {"ok":true} }`
   - Vercel 函数日志：`[magic-link] start` → `ok`
   - 收到邮件 → 点击链接返回站点 → 顶部显示邮箱前缀与“退出登录”。

## 交付物
- 新的云端函数文件与项目配置说明
- 本地/线上运行与排错指南（错误含义与修复步骤）

## 时间
- 30–60 分钟内完成代码与说明，部署后提供线上地址与测试指引。