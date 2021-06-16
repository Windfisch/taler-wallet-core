#!/usr/bin/env bash
# This file is in the public domain.
pnpm clean && pnpm compile && rm -rf extension/ && ./pack.sh  && (cd extension/ && unzip taler*.zip)

