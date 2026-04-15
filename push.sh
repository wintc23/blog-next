#!/bin/bash
# Mirror of blog-ssr/push.sh — push current branch to GitHub then ssh
# to the VPS, pull, install, build, restart pm2.
set -e

git push origin main

ssh root@8.129.22.92 << 'AUTOSCRIPT'
set -e
cd /home/lushg/blog-next
git fetch origin
git reset --hard origin/main
npm ci
npm run build
pm2 restart pm2.json
AUTOSCRIPT

echo 'done'
