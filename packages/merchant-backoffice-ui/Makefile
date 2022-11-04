# This Makefile has been placed in the public domain

# Settings from "./configure"
include .config.mk

all:
	@echo run \'make install\' to install

spa_dir=$(prefix)/share/taler/merchant-backoffice

install:
	pnpm install --frozen-lockfile --filter @gnu-taler/merchant-backoffice...
	pnpm run build
	install -d $(spa_dir)
	install ./dist/* $(spa_dir)

