#!/usr/bin/env bash
pnpm clean && pnpm compile && rm -rf extension/ && ./pack.sh  && (cd extension/ && unzip taler*.zip)

