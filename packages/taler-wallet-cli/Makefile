# This Makefile has been placed in the public domain.

-include ../../.config.mk
include .config.mk

$(info prefix is $(prefix))

all:
	@echo use 'make install' to build and install taler-wallet-cli

ifndef prefix
.PHONY: warn-noprefix install
warn-noprefix:
	@echo "no prefix configured, did you run ./configure?"
install: warn-noprefix
else
install_target = $(prefix)/lib/taler-wallet-cli
.PHONY: install
install:
	pnpm install --frozen-lockfile --filter @gnu-taler/taler-wallet-cli...
	install -d $(prefix)/bin
	install -d $(install_target)/bin
	install -d $(install_target)/node_modules/taler-wallet-cli
	install -d $(install_target)/node_modules/taler-wallet-cli/bin
	install -d $(install_target)/node_modules/taler-wallet-cli/dist
	install ./dist/taler-wallet-cli.js $(install_target)/node_modules/taler-wallet-cli/dist/
	install ./dist/taler-wallet-cli.js.map $(install_target)/node_modules/taler-wallet-cli/dist/
	install ./bin/taler-wallet-cli.mjs $(install_target)/node_modules/taler-wallet-cli/bin/
	ln -sf $(install_target)/node_modules/taler-wallet-cli/bin/taler-wallet-cli.mjs $(prefix)/bin/taler-wallet-cli.mjs
endif
