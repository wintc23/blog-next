# 前端发布

Next.js 在开发机或 CI 构建，服务器只运行产物。线上约 3.7 GB 内存，同时运行 MySQL 与 API，不要在服务器执行 `npm run build`。

## 发布

本地需要 Node.js 20+、npm、Git、SSH、scp、tar、shasum；服务器需要现有 Linux 依赖、Node.js、PM2、Python 3 和 flock。先提交并推送要发布的版本：

```bash
git push origin main
npm run deploy
```

脚本在临时 Git worktree 中构建当前提交；工作区未提交的改动不会进入产物。默认通过 `npm ci` 安装本地构建依赖。构建读取服务器 `.env.production.local`，不继承本地开发环境变量；临时配置文件仅当前用户可读，退出时清理。

流程：本地生产构建（含类型检查）→ 打包并上传 → SHA256 校验 → 服务器快进到对应提交 → `127.0.0.1:8001` 预览 → 检查页面与静态资源 → 切换 PM2 → 再检查 → 保存 PM2 配置。检查失败时恢复原提交及构建目录。旧构建保留，不自动删除。

默认服务器 `wintc.top`，目录 `/home/lushg/blog-next`，Node 路径 `/root/.nvm/versions/node/v22.22.2/bin`。可使用 `DEPLOY_HOST`、`DEPLOY_REMOTE_DIR`、`DEPLOY_REMOTE_NODE_BIN` 覆盖。通过 SSH 配置管理认证，不把密钥写入脚本。

如本地已经按当前 lockfile 安装过依赖，可复用，跳过重复安装：

```bash
DEPLOY_USE_LOCAL_MODULES=1 npm run deploy
```

服务器的 `package-lock.json` 必须与目标提交一致；如有依赖变更，先按新的 lockfile 准备服务器 Linux 依赖，再发布。不能复制 macOS 的 `node_modules` 到 Linux。脚本不会修改后端或数据库。

## 手动回退

发布日志会记录上一版构建目录。服务器加载 Node 环境后，使用记录的目录回退：

```bash
export PATH=/root/.nvm/versions/node/v22.22.2/bin:$PATH
cd /home/lushg/blog-next
NEXT_DIST_DIR=.next-release-上一版 pm2 restart blog-next --update-env
pm2 save
```

如果版本还修改了 `next.config.mjs` 等运行时配置，应同时恢复对应提交。服务器的配置与旧构建应保留到新版本稳定后，再按维护计划清理。
