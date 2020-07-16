#!/usr/bin/env bash

set -eu

set -x

devtag=$1

git tag $devtag || true

make rollup

if [[ ! -d prebuilt ]]; then
  git worktree add prebuilt
fi

mkdir -p prebuilt/$devtag

cp dist/standalone/taler-wallet-android.js prebuilt/$devtag/
cd prebuilt
git add -A $devtag
git commit -m "prebuilt files for $devtag"
