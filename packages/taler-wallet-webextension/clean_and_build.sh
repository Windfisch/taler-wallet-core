#!/bin/bash

set -e

rm -rf dist lib tsconfig.tsbuildinfo .linaria-cache

echo typecheck and bundle...
node build-fast-with-linaria.mjs &
pnpm tsc --noEmit &
wait -n
wait -n

echo testing...
pnpm test -- -R dot

echo packing...
rm -rf extension/
./pack.sh
