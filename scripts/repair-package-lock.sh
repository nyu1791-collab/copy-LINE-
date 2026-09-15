#!/usr/bin/env bash
set -euo pipefail
lockfile="${1:-package-lock.json}"
[[ -f "${lockfile}" ]] || { echo "Missing ${lockfile}" >&2; exit 66; }
first="$(head -n 1 "${lockfile}")"
if [[ "${first}" == "Warning: truncated output (original token count:"* ]]; then
  second="$(sed -n '2p' "${lockfile}")"
  third="$(sed -n '3p' "${lockfile}")"
  [[ "${second}" == "Total output lines:"* && -z "${third}" ]] || { echo 'Unexpected package-lock import prefix; refusing to rewrite.' >&2; exit 65; }
  tmp="${lockfile}.repair.$$"
  tail -n +4 "${lockfile}" > "${tmp}"
  node -e "JSON.parse(require('node:fs').readFileSync(process.argv[1],'utf8'))" "${tmp}"
  mv "${tmp}" "${lockfile}"
  echo '[sites] repaired imported package-lock prefix'
else
  node -e "JSON.parse(require('node:fs').readFileSync(process.argv[1],'utf8'))" "${lockfile}"
fi
