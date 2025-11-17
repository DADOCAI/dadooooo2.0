## 目标
- 修复“打开页面是纯白”的问题，确保首页与工具页可正常展示
- 在 `localhost:3000` 跑通 Supabase 邮件注册/登录（验证码/验证链接）流程
- 本地后端统一处理邮箱验证码接口，并与前端 `/api` 代理联通

## 排查与修复步骤
### A. 基础环境与变量
1. 新建或完善项目根 `.env.local`（仅本地），内容：
   - `VITE_SUPABASE_URL=<你的 Supabase 项目 URL>`
   - `VITE_SUPABASE_ANON_KEY=<你的 Supabase anon key>`
2. 重启前端开发服务器；浏览器控制台应打印：`supabase env { url, anonKeyStart }`，用来确认与控制台一致。
3. Supabase 控制台 → Authentication → URL Configuration：
   - Site URL 设置为 `http://localhost:3000`
   - 如需验证链接重定向，`Additional Redirect URLs` 可添加 `http://localhost:3000`

### B. 白屏问题定位
1. 浏览器控制台查看是否有红色报错（模块加载、路由错误、资源 404 等）；我将添加全局错误边界，出现异常时以友好提示代替白屏。
2. 在入口页面与关键组件（`Header/Home/Ascii`）加最小化挂载日志（不改视觉），快速定位具体崩溃点。
3. 检查资源与别名配置（`vite.config.ts`）是否能解析到 `src/assets/*`；如有路径问题，统一走相对导入确保加载。

### C. Supabase 登录/注册行为
1. 前端已接入 `supabase.auth.signUp / signInWithPassword` 并打印日志：
   - 成功：`supabase signup ok` / `supabase login ok`
   - 失败：`supabase signup error` / `supabase login error`（含 message/status/hint）
2. 若你希望“邮箱验证码登录”（不记密码），我会增加 `signInWithOtp({ email })` 按钮，并在控制台打印返回值与可能失败原因。
3. 统一提示：失败时不只弹“失败”，同时打印完整错误对象到控制台，便于快速定位。

### D. 本地后端联通（验证码接口）
1. 后端服务运行在 `http://localhost:8000`，前端通过 `/api` 代理联通（已在 `vite.config.ts`）。
2. 接口：
   - `POST /api/auth/send-email-code`（冷却 60 秒，开发模式打印验证码）
   - `POST /api/auth/verify-email-code`（验证通过后，前端注册按钮可点击）
3. 如你愿意用 Supabase 完整代替后端发信，我可以改为 Supabase Edge Functions，避免维护本地后端。

### E. 验证流程（你只需点几下）
1. 启动后端与前端；打开 `http://localhost:3000`，看首页是否正常显示（不再白屏）。
2. 打开“立即注册”：
   - 输入邮箱 → 点击“发送验证码” → 控制台或邮箱查看验证码 → 输入 6 位 → 注册按钮变为可点击
   - 同时观察控制台日志是否出现 `supabase signup ok` 或 `error`
3. 若选择“魔法链接登录”，输入邮箱后即可收到登录链接，点击后回到 `localhost:3000` 并显示登录成功。

## 我将进行的具体改动
- 添加 `.env.local`（不提交到仓库）并配置 Supabase URL/anon key
- 增加全局错误边界与轻量日志（不改变 UI 风格）
- 完善注册弹窗：邮箱验证码发送/验证失败时输出详细错误到控制台
- 可选：增加“邮箱验证码登录（无密码）”按钮，走 `signInWithOtp`

## 交付与时间
- 预计 30–60 分钟完成本地跑通与白屏修复
- 完成后你可直接在 `localhost:3000` 注册/登录；如需线上部署，我再帮你接 Vercel 环境变量与 Supabase/Resend 密钥

## 需要你提供的最小信息
- 你的 Supabase 项目 `URL` 与 `anon key`（从 Supabase 控制台复制）
- 是否采用“魔法链接登录”（无需密码），如果是就开启 OTP 登录按钮

确认后我将执行以上步骤，修复白屏并跑通本地登录验证流程。