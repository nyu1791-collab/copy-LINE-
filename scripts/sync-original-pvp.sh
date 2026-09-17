#!/usr/bin/env bash
set -euo pipefail

# Pin the last complete pre-maintenance PvP UI. The live repository's current
# index intentionally contains the maintenance shell, so copying main would
# reproduce the broken/closed page instead of the original ranking site.
SOURCE_REPO="line-rangers-fan/line-rangers-pvp"
SOURCE_COMMIT="517291dfa3f9eeaecd8b6c6f1d445da52f0480ac"
PROJECT_ROOT="${SITES_PROJECT_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
DEST="${PROJECT_ROOT}/public/pvp"
TMP="$(mktemp -d)"
trap 'rm -rf "${TMP}"' EXIT

command -v curl >/dev/null || { echo 'curl is required to sync the original PvP site.' >&2; exit 69; }
command -v tar >/dev/null || { echo 'tar is required to sync the original PvP site.' >&2; exit 69; }

ARCHIVE="${TMP}/source.tar.gz"
EXTRACT="${TMP}/extract"
ENTRY_TEMPLATE="${TMP}/community-entry.js"
mkdir -p "${EXTRACT}"

[[ -s "${PROJECT_ROOT}/public/pvp/assets/community-entry.js" ]] || { echo 'The localized community entry template was not found.' >&2; exit 71; }
cp "${PROJECT_ROOT}/public/pvp/assets/community-entry.js" "${ENTRY_TEMPLATE}"

echo "Syncing original PvP UI from ${SOURCE_REPO}@${SOURCE_COMMIT}..."
curl --fail --silent --show-error --location --retry 3 --connect-timeout 10 --max-time 90 \
  "https://codeload.github.com/${SOURCE_REPO}/tar.gz/${SOURCE_COMMIT}" \
  --output "${ARCHIVE}"
tar -xzf "${ARCHIVE}" -C "${EXTRACT}"
SOURCE_ROOT="$(find "${EXTRACT}" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
[[ -n "${SOURCE_ROOT}" && -d "${SOURCE_ROOT}/docs" ]] || { echo 'Original PvP docs directory was not found.' >&2; exit 70; }

rm -rf "${DEST}"
mkdir -p "${DEST}"
cp -a "${SOURCE_ROOT}/docs/." "${DEST}/"
cp "${ENTRY_TEMPLATE}" "${DEST}/assets/community-entry.js"

# Current data is served through same-origin route handlers instead of freezing
# a build-time snapshot. Keep the copied UI/assets exact while the ranking data
# remains the canonical live source.
rm -f \
  "${DEST}/data/character_usage.json" \
  "${DEST}/data/character_usage_history.json"

INDEX="${DEST}/index.html"
node --input-type=module - "${INDEX}" <<'NODE'
import {readFileSync,writeFileSync} from 'node:fs';
const path=process.argv[2];
let html=readFileSync(path,'utf8');

// This is an Owner review copy, not the public production site. Remove only the
// maintenance overlay; keep noindex/nofollow and all original ranking markup.
html=html.replace(/\s*<link rel="stylesheet" href="\.\/assets\/maintenance\.css[^>]*>/,'');
html=html.replace('<body class="maintenance-mode">','<body>');
html=html.replace(/\s*<section class="maintenance-screen"[\s\S]*?<\/section>/,'');
html=html.replace("frame-ancestors 'none';","frame-ancestors 'self';");

// Keep the original PvP markup and use the localized same-site community
// entry template. The entry itself hides the character name and follows the
// language selected by the original PvP page.
html=html.replace(/community-entry\.js\?v=[^"']+/,"community-entry.js?v=20260917-i18n-1");
if(!html.includes('id="ranking-section"')||!html.includes('id="community-board-entry-slot"')||!html.includes('community-entry.js'))throw new Error('PvP copy patch contract failed');
writeFileSync(path,html);
NODE

echo "Original PvP site copied to public/pvp with the local board attached."
