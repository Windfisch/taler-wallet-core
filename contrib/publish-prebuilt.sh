#!/usr/bin/env bash

# Helper script to publish a prebuilt wallet-core.
# Assumes that the prebuilt branch is checked out
# at ./prebuilt as a git worktree.

set -eu

TAG=$1

pnpm run compile
mkdir prebuilt/$TAG
cp packages/taler-wallet-embedded/dist/taler-wallet-embedded.js prebuilt/$TAG/taler-wallet-embedded.js
git -C prebuilt add .
git -C prebuilt commit -a -m "prebuilt $TAG"
git -C prebuilt push
sha256sum prebuilt/$TAG/taler-wallet-android.js
