#!/bin/sh
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Нужен Node.js 18 или новее: https://nodejs.org/"
  read -r _
  exit 1
fi
node qa-report-agent.js
