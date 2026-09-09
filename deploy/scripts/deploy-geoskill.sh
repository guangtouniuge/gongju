#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/www/wwwroot/geoskill.7chacha.com}"
REPO_URL="${REPO_URL:-https://github.com/guangtouniuge/gongju.git}"
BRANCH="${BRANCH:-main}"
PM2_NAME="${PM2_NAME:-geo-content-api}"

echo "Deploying geoskill from ${REPO_URL}#${BRANCH}"

if ! command -v git >/dev/null 2>&1; then
  echo "git is required" >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required" >&2
  exit 1
fi

mkdir -p "${APP_DIR}"

if [ ! -d "${APP_DIR}/.git" ]; then
  tmp_dir="$(mktemp -d)"
  git clone --branch "${BRANCH}" --depth 1 "${REPO_URL}" "${tmp_dir}"
  if [ -f "${APP_DIR}/.env" ]; then
    cp "${APP_DIR}/.env" "${tmp_dir}/.env"
  fi
  cp -a "${tmp_dir}/." "${APP_DIR}/"
  rm -rf "${tmp_dir}"
else
  cd "${APP_DIR}"
  git fetch origin "${BRANCH}"
  git reset --hard "origin/${BRANCH}"
fi

cd "${APP_DIR}"

npm ci
npm run build
npm prune --omit=dev

if [ -f deploy/nginx/geoskill.7chacha.com.conf ] && [ -d /etc/nginx/conf.d ]; then
  cp deploy/nginx/geoskill.7chacha.com.conf /etc/nginx/conf.d/geoskill.7chacha.com.conf
fi

if command -v pm2 >/dev/null 2>&1; then
  pm2 describe "${PM2_NAME}" >/dev/null 2>&1 \
    && pm2 restart "${PM2_NAME}" --update-env \
    || pm2 start server/geo-api-server.mjs --name "${PM2_NAME}"
  pm2 save || true
else
  echo "pm2 is not installed; frontend built, API was not restarted" >&2
fi

if command -v nginx >/dev/null 2>&1; then
  nginx -t
  nginx -s reload
fi

echo "geoskill deployment finished"
