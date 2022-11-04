# This Makefile has been placed in the public domain

# Settings from "./configure"
include .config.mk

all:
	@echo run \'make install\' to install

spa_dir=$(prefix)/share/taler/demobank-ui

install:
	pnpm install --frozen-lockfile --filter @gnu-taler/demobank-ui...
	pnpm run check
	pnpm run build
	install -d $(spa_dir)
	install ./dist/* $(spa_dir)

