#!/usr/bin/env bash

set -eu

if [[ ! -e package.json ]]; then
  echo "Please run this from the root of the repo.">&2
  exit 1
fi

vers_manifest=$(jq -r '.version' manifest.json)

zipfile="taler-wallet-webextension-${vers_manifest}.zip"

mkdir tmp
jq '. | .name = "GNU Taler Wallet" ' manifest.json > tmp/manifest.json
cp -r dist static tmp/
cd tmp
zip -r "$zipfile" dist static manifest.json
cd ..
mv "./tmp/$zipfile" ./
rm -rf tmp
