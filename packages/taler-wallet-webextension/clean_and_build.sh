#!/usr/bin/env bash
# This file is in the public domain.
set -e
[ "also-wallet" == "$1" ] && { pnpm -C ../taler-wallet-core/ compile || exit 1; }
[ "also-util" == "$1" ] && { pnpm -C ../taler-util/ prepare || exit 1; }
pnpm clean && pnpm compile && rm -rf extension/ && ./pack.sh
(cd extension/v2 && unzip taler*.zip)
(cd extension/v3 && unzip taler*.zip)


