## 目标

* 先在本地成功跑起来前端与后端，打开网页进行可视化预览。

* 快速排查并给出可执行的微调建议（UI/交互/稳定性）。

* 给出 ASCII 工具的两种整合方案，先选用最快可预览的方案。

* 记录后续要长期完善的功能模块与上线路线图。

## 当前状态概述

* 前端：Vite + React + TypeScript + `react-router-dom`，Tailwind v4 预编译样式，入口 `src/main.tsx`，首页 `src/pages/Home.tsx`。

* 后端：FastAPI（`server/app.py`），暴露 `/api/health` 与 `/api/cutout`，Vite 通过代理转发到 `http://localhost:8000`。

* 工具：已接入抠图与 Halftone；ASCII 工具有独立的 Streamlit 项（未与前端合并）。

* 路由：`/`、`/about`、`/halftone`、`/cutout`；ASCII 的入口在 `src/pages/Home.tsx` 仍为占位 `link: "#grid"`（`src/pages/Home.tsx:39-49`）。

## 本地预览环境搭建

* 前端（Windows PowerShell）：

  * 安装依赖：`npm install`

  * 开发启动：`npm run dev`

  * 预览地址：`http://localhost:3000`（Vite 配置了端口与自动打开）

* 后端（FastAPI）：

  * 安装依赖：`pip install -r server/requirements.txt`

  * 启动服务：`uvicorn server.app:app --port 8000 --reload`

  * 健康检查：打开 `http://localhost:8000/api/health`

* 同时运行前端与后端以确保 `/api` 代理生效；在 `Cutout` 页面上用示例图片测试抠图。

## ASCII 工具整合（两步走）

* 方案 A（快速预览，优先实施）：保留现有独立 Streamlit 服务，通过反向代理或 iframe 集成到 React 路由 `/ascii`。

  * 启动 Streamlit（默认端口 `8501`），在前端新增路由 `/ascii`，以 `iframe` 或 `proxy` 方式嵌入页面，马上可用。

  * 将首页卡片的占位 `link: "#grid"` 改为指向 `/ascii`（`src/pages/Home.tsx:39-49`）。

* 方案 B（深度整合，后续迭代）：把 ASCII 生成逻辑封装成 HTTP API（整合进 FastAPI 或独立微服务），前端页面通过 `fetch` 与统一 UI 交互；便于统一鉴权、计费与日志。

## 快速检查与微调建议

* 导航与可达性：确认头部固定样式与遮挡关系（`src/components/Header.tsx:25` 已为 `fixed top-0 ...`），加内容区顶部内边距，避免首屏被遮挡。

* 抠图体验：在 `BackgroundRemover.tsx` 增加进度指示与异常提示，限制文件大小与类型，提升稳定性。

* Halftone 嵌入：确保 `public/halftone-demo/*` iframe 的跨域与样式自适应。

* 首页工具入口：统一卡片文案与路由；ASCII 卡片改为可点击跳转 `/ascii`。

* 构建脚本：在 `package.json` 补充 `"preview": "vite preview"` 方便生产预览（后续我来添加）。

## 上线与运维路线图

* 前端：`vite build` 产出静态资源，Nginx 作为静态站点与反向代理入口（TLS/HTTP/2）。

* 后端：FastAPI 由 Uvicorn/Gunicorn 部署在同台或独立服务器，通过 Nginx 反代到 `/api`。

* 域名与证书：购买域名、DNS 解析到服务器；申请并自动续期 HTTPS 证书（Let’s Encrypt/ACME）。

* 监控与日志：健康检查 `/api/health`、错误日志、访问统计与告警。

## 登录与支付后续规划

* 登录/鉴权：后端 JWT 或 Session；前端改造 `AuthContext.tsx` 接入真实 API，支持注册、登录、找回密码。

* 支付：按你的受众与地区选型（Stripe 国际、支付宝/微信国内），后端统一订单与订阅逻辑，前端支付回调与状态提示。

* 账户与作品库：用户中心、作品管理、下载/分享、历史记录与收藏。

* 计费与订阅：套餐与用量限制，发票与对账，管理员后台。

## 我将执行的步骤（获得你确认后）

1. 本地安装依赖并启动前端与后端，打开 `http://localhost:3000` 给你预览。
2. 校验抠图工具与 Halftone 的交互流程，截图/描述问题点。
3. 以方案 A 快速把 ASCII 工具挂到 `/ascii` 实现预览入口；首页卡片指向该路由。
4. 汇总可视化微调清单并按优先级执行（导航、加载态、错误提醒）。
5. 输出上线清单与时间预估，开始搭建生产环境的基础配置。

## 需要你确认

* 是否先采用 ASCII 方案 A（快速预览），后续再做方案 B 的深度整合？

* 如果你有支付渠道偏好（Stripe/支付宝/微信），我将基于这个选型设计后端与页面流程。

