## 问题结论
- 浏览器直连 Supabase 报 `ERR_CONNECTION_CLOSED`，属网络层拦截/连接被中途关闭。
- 后端代理最初 500 的原因是未正确读取 `.env.local`；现已修复并在日志打印 Supabase 配置（`[server] supabase config ...`）。
- 仍存在“fetch failed”说明本机环境到 Supabase 的外网链路不稳定/被拦截。

## 解决策略（两路并行，确保可用）
### 路线 A（推荐）：把“发送登录链接”放到云端函数，绕过本机网络
1. 创建 Vercel 项目并部署一个 `/api/send-magic-link`（Node/Edge Function），使用 `@supabase/supabase-js` 调 `auth.signInWithOtp`。
2. 在 Vercel 环境变量里配置：
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`（服务端专用，绝不能放前端）
3. 前端保持现有弹窗 UI，不改样式；仅把调用地址改为云端的 `/api/send-magic-link`。
4. Supabase 控制台 → Auth → URL Configuration：
   - Site URL 增加线上域名（例如 `https://你的vercel域名`），保留 `http://localhost:3000` 作为本地开发回跳。
5. 验证：点击“发送登录链接”→ 控制台看到 200 → 邮件到达 → 点击链接返回站点 → 顶部显示邮箱前缀与“退出登录”。

### 路线 B（本机临时修复）：保证本机能连 Supabase
1. 打开 `https://vnmwhwtofgvntwnynpmy.supabase.co/auth/v1/health`；若无法打开或被中途关闭，就是网络拦截。
2. 试以下任一方式：
   - 切换网络（手机热点/VPN）
   - 暂停拦截类软件/浏览器扩展（隐私、广告拦截）
   - Windows 防火墙允许 `node.exe` 与浏览器访问外网
3. 若你的网络必须经过代理：
   - 给 Node 进程配置代理（如公司代理）：
     - 设置系统环境变量 `HTTPS_PROXY=http://<代理地址>`
     - 使用 `global-agent` 在后端入口初始化代理（云端函数不需要，适用于本机）。
4. 验证：本机可直接打开上面的 health 链接；再次“发送登录链接”应正常返回 200。

## 前后端检查清单
- `.env.local`（任一前缀都可）：
  - `VITE_SUPABASE_URL=https://vnmwhwtofgvntwnynpmy.supabase.co`
  - `VITE_SUPABASE_ANON_KEY=<你的 anon key>`
  - 或 `NEXT_PUBLIC_*` 同值
- 服务器日志：
  - 启动时应打印 `[server] supabase config { url: 'https://...', keyStart: 'eyJhbG...' }`
- 浏览器 Console：
  - `supabase env { url: 'https://...', anonKeyStart: 'eyJhbG...' }`
  - 调用发送链接时：`send-magic-link response { status: 200, body: {"ok":true} }`

## 我将实施的具体改动（获批后执行）
1. 新增 Vercel 云函数 `/api/send-magic-link`（Node/Edge），使用服务端密钥调用 Supabase，容错并打印详细日志。
2. 前端保持现有弹窗 UI，仅把请求地址切到云端函数；本地开发也直接打云端，以确保稳定。
3. 更新 Supabase Auth 的 Site URL：保留 `http://localhost:3000`，新增你的 vercel 线上域名。
4. 验证整个链路并把“运行与排错指南”文档发你（包含常见错误解释与处理）。

## 交付给你的一份“解决方法”
- 一张运行手册：
  - 如何在本地/线上测试 Magic Link
  - 出错时看哪条日志（前端/后端/云函数）
  - 常见错误含义（429 频率、400 地址、5xx 网络）和对应修复办法
- 一个可用的线上地址（Vercel 域名），你随时可用邮箱登录；无需关心本机网络。

## 时间
- 预计 30–60 分钟完成云端函数部署与端到端验证；完成后把地址与操作说明发你。