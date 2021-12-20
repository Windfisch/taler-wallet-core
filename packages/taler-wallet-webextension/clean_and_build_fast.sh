#!/usr/bin/env bash
# This file is in the public domain.
set -e

rm -rf dist lib tsconfig.tsbuildinfo
(cd ../.. && rm -rf build/web && ./contrib/build-fast-web.sh)
rm -rf extension/
./pack.sh
(cd extension/v2 && unzip taler*.zip)
(cd extension/v3 && unzip taler*.zip)

