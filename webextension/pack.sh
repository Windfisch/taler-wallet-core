#!/usr/bin/env bash

set -eu

if [[ ! -e package.json ]]; then
  echo "Please run this from the root of the repo.">&2
  exit 1
fi

vers_manifest=$(jq -r '.version' webextension/manifest.json)

rm -rf dist/wx
mkdir -p dist/wx
cp webextension/manifest.json dist/wx/
cp -r webextension/static/* dist/wx/
cp -r dist/webextension/* dist/wx/

cd dist/wx

zipfile="../taler-wallet-${vers_manifest}.zip"

rm -f -- "$zipfile"
zip -r "$zipfile" ./*
