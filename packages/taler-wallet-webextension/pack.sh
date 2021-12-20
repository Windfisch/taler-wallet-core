#!/usr/bin/env bash
# This file is in the public domain.

set -eu

if [[ ! -e package.json ]]; then
  echo "Please run this from the root of the repo.">&2
  exit 1
fi

vers_manifest=$(jq -r '.version' manifest-v2.json)

zipfile="taler-wallet-webextension-${vers_manifest}.zip"

TEMP_DIR=$(mktemp -d)
jq '. | .name = "GNU Taler Wallet" ' manifest-v2.json > $TEMP_DIR/manifest.json
cp -r dist static $TEMP_DIR
(cd $TEMP_DIR && zip -r "$zipfile" dist static manifest.json)
mkdir -p extension/v2
mv "$TEMP_DIR/$zipfile" ./extension/v2/
rm -rf $TEMP_DIR
echo "Packed webextension: extension/v2/$zipfile"


vers_manifest=$(jq -r '.version' manifest-v3.json)

zipfile="taler-wallet-webextension-${vers_manifest}.zip"

TEMP_DIR=$(mktemp -d)
jq '. | .name = "GNU Taler Wallet" ' manifest-v3.json > $TEMP_DIR/manifest.json
cp -r dist static $TEMP_DIR
(cd $TEMP_DIR && zip -r "$zipfile" dist static manifest.json)
mkdir -p extension/v3
mv "$TEMP_DIR/$zipfile" ./extension/v3/
rm -rf $TEMP_DIR
echo "Packed webextension: extension/v3/$zipfile"
