#!/usr/bin/env bash
# Build a committed snapshot locally. The server only verifies and runs it.
set -euo pipefail

ROOT=$(git -C "$(dirname "$0")/.." rev-parse --show-toplevel)
HOST=${DEPLOY_HOST:-wintc.top}
REMOTE_DIR=${DEPLOY_REMOTE_DIR:-/home/lushg/blog-next}
REMOTE_NODE_BIN=${DEPLOY_REMOTE_NODE_BIN:-/root/.nvm/versions/node/v22.22.2/bin}
REV=$(git -C "$ROOT" rev-parse HEAD)
DIST=".next-release-${REV:0:7}-$(date -u +%Y%m%dT%H%M%S)"
WORK=$(mktemp -d "${TMPDIR:-/tmp}/blog-next-deploy.XXXXXX")
chmod 700 "$WORK"

cleanup() {
  git -C "$ROOT" worktree remove --force "$WORK/repo" >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

# These values become remote shell arguments; reject shell metacharacters.
[[ "$HOST" =~ ^[a-zA-Z0-9_.@-]+$ && "$HOST" != -* ]] || { echo 'Invalid DEPLOY_HOST' >&2; exit 1; }
[[ "$REMOTE_DIR" =~ ^/[a-zA-Z0-9_./-]+$ && "$REMOTE_NODE_BIN" =~ ^/[a-zA-Z0-9_./-]+$ ]] || { echo 'Invalid remote path' >&2; exit 1; }
node -e 'if (Number(process.versions.node.split(".")[0]) < 20) process.exit(1)' || { echo 'Local Node.js 20 or newer is required.' >&2; exit 1; }

echo "Preparing committed revision $REV"
git -C "$ROOT" worktree add --detach "$WORK/repo" "$REV"
scp -q "$HOST:$REMOTE_DIR/.env.production.local" "$WORK/repo/.env.production.local"
chmod 600 "$WORK/repo/.env.production.local"
scp -q "$HOST:$REMOTE_DIR/package-lock.json" "$WORK/server-package-lock.json"
cmp -s "$WORK/repo/package-lock.json" "$WORK/server-package-lock.json" || {
  echo 'Server dependencies differ. Install the matching Linux dependencies before deploying.' >&2
  exit 1
}

cd "$WORK/repo"
if [[ ${DEPLOY_USE_LOCAL_MODULES:-0} == 1 ]]; then
  git -C "$ROOT" diff --quiet HEAD -- package.json package-lock.json
  test -d "$ROOT/node_modules"
  ln -s "$ROOT/node_modules" node_modules
else
  npm ci --include=dev --no-audit --no-fund
fi
# Production values come from the server file, without local dev overrides.
echo "Building $DIST locally"
env -i HOME="$HOME" PATH="$PATH" TMPDIR="$WORK" NODE_ENV=production NEXT_DIST_DIR="$DIST" npm run build
COPYFILE_DISABLE=1 tar --exclude="$DIST/cache" -czf "$WORK/release.tgz" "$DIST"
SHA=$(shasum -a 256 "$WORK/release.tgz" | awk '{print $1}')
ARCHIVE="/tmp/blog-next-${DIST#.next-}.tgz"
scp -q "$WORK/release.tgz" "$HOST:$ARCHIVE"

ssh -o BatchMode=yes "$HOST" "bash -s -- '$REMOTE_DIR' '$REMOTE_NODE_BIN' '$REV' '$DIST' '$SHA' '$ARCHIVE'" <<'REMOTE'
set -euo pipefail
DIR=$1 NODE_BIN=$2 REV=$3 DIST=$4 SHA=$5 ARCHIVE=$6
export PATH="$NODE_BIN:/usr/local/bin:/usr/bin:/bin"
cd "$DIR"
exec 9>"$DIR/.git/frontend-deploy.lock"
flock -n 9 || { echo 'Another frontend deployment is running.' >&2; exit 1; }
git diff --quiet HEAD -- || { echo 'Server has tracked changes; deployment stopped.' >&2; exit 1; }
printf '%s  %s\n' "$SHA" "$ARCHIVE" | sha256sum -c -
git fetch origin main
git merge-base --is-ancestor "$REV" origin/main
git merge-base --is-ancestor HEAD "$REV"
test ! -e "$DIST"
python3 - <<'PY'
import socket
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 8001))
PY
OLD_REV=$(git rev-parse HEAD)
OLD_DIST=$(pm2 jlist | python3 -c 'import json,sys; app=next(a for a in json.load(sys.stdin) if a["name"]=="blog-next"); print(app["pm2_env"].get("NEXT_DIST_DIR", ".next"))')
PREVIEW="blog-next-preview-${REV:0:7}"
UPDATED=0
SWITCHED=0
finish() {
  result=$?
  trap - EXIT
  set +e
  pm2 delete "$PREVIEW" >/dev/null 2>&1
  if [[ "$result" != 0 ]]; then
    if [[ "$UPDATED" == 1 ]]; then git reset --keep "$OLD_REV"; fi
    if [[ "$SWITCHED" == 1 ]]; then
      NEXT_DIST_DIR="$OLD_DIST" pm2 restart blog-next --update-env
    fi
    echo "Deployment failed; previous release retained: $OLD_DIST" >&2
  else
    rm -f "$ARCHIVE"
  fi
  pm2 save >/dev/null
  exit "$result"
}
trap finish EXIT
git merge --ff-only "$REV"
UPDATED=1
tar -xzf "$ARCHIVE"
NEXT_DIST_DIR="$DIST" NODE_ENV=production pm2 start node_modules/next/dist/bin/next \
  --name "$PREVIEW" --interpreter "$NODE_BIN/node" -- start -H 127.0.0.1 -p 8001

health() {
  python3 - "$1" <<'PY'
import html, re, sys, time
from urllib.request import urlopen
base = sys.argv[1]
for attempt in range(30):
    try:
        with urlopen(base + '/', timeout=10) as response:
            page = response.read().decode()
        break
    except Exception:
        if attempt == 29:
            raise
        time.sleep(1)
for path in ['/ai-news', '/products', '/article', '/message']:
    with urlopen(base + path, timeout=20) as response:
        assert response.status == 200, path
assets = set(re.findall(r'(?:src|href)="(/_next/static/[^"<>]+)"', page))
assert assets, 'No Next.js assets found'
for path in assets:
    with urlopen(base + html.unescape(path), timeout=20) as response:
        assert response.status == 200, path
print('Healthy:', base, 'pages and', len(assets), 'static assets')
PY
}
health http://127.0.0.1:8001
SWITCHED=1
NEXT_DIST_DIR="$DIST" pm2 restart blog-next --update-env
health http://127.0.0.1:8000
echo "Deployed $REV with $DIST (SHA256 $SHA). Previous release: $OLD_DIST"
REMOTE
