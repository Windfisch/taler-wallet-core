#!/usr/bin/env bash

set -eu

if [[ ! -e package.json ]]; then
  echo "Please run this from the root of the repo.">&2
  exit 1
fi

vers_manifest=$(jq -r '.version' manifest.json)

zipfile="taler-wallet-${vers_manifest}.zip"

rm -f -- "$zipfile"
zip -r "$zipfile" dist static manifest.json
