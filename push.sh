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
# Restart by process name, NOT pm2.json: the running entry was created
# manually with --interpreter pointing at the Node 22 nvm binary, and
# `pm2 restart pm2.json` would re-read the JSON config and replace the
# interpreter with the daemon's default (Node 12), breaking Next 15.
pm2 restart blog-next --update-env
AUTOSCRIPT

echo 'done'
