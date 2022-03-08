#!/usr/bin/env bash
# This file is in the public domain.
set -e

mv node_modules{,_saved} 
rm -rf dist lib tsconfig.tsbuildinfo
(cd ../.. && rm -rf build/web && ./contrib/build-fast-web.sh)
rm -rf extension/
./pack.sh

mv node_modules{_saved,} 
