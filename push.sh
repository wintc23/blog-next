#!/bin/bash
# Mirror of blog-ssr/push.sh — push current branch to GitHub then ssh
# to the VPS, pull, install, build, restart pm2.
set -e

git push origin main

ssh root@wintc.top << 'AUTOSCRIPT'
set -e
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use default
cd /home/lushg/blog-next
git fetch origin
git reset --hard origin/main
npm ci
npm run build
# Recreate the process with the active nvm Node binary and explicit network
# binding. This avoids inheriting stale PM2 arguments and keeps port 8000 off
# the public interface.
NODE_BIN="$(command -v node)"
pm2 delete blog-next || true
pm2 start node_modules/next/dist/bin/next \
  --name blog-next \
  --interpreter "$NODE_BIN" \
  -- start -H 127.0.0.1 -p 8000
pm2 save
AUTOSCRIPT

echo 'done'
