# This Makefile has been placed in the public domain.

tsc = node_modules/typescript/bin/tsc
pogen = node_modules/@gnu-taler/pogen/bin/pogen.js
typedoc = node_modules/typedoc/bin/typedoc
ava = node_modules/.bin/ava
nyc = node_modules/nyc/bin/nyc.js
git-archive-all = ./build-system/taler-build-scripts/archive-with-submodules/git_archive_all.py

include .config.mk

.PHONY: compile
compile:
	pnpm install -r --frozen-lockfile
	pnpm run compile


.PHONY: dist
dist:
	$(git-archive-all) \
	       	--include ./configure \
	       	--include ./packages/taler-wallet-cli/configure \
	       	--include ./packages/demobank-ui/configure \
	       	taler-wallet-$(shell git describe --tags --abbrev=0).tar.gz

# Create tarball with git hash prefix in name
.PHONY: dist-git
dist-git:
	$(git-archive-all) --include ./configure taler-wallet-$(shell git describe --tags).tar.gz

.PHONY: publish
publish:
	pnpm i -r --frozen-lockfile
	pnpm run compile
	pnpm publish -r --no-git-checks

# make documentation from docstrings
.PHONY: typedoc
typedoc:
	$(typedoc) --out dist/typedoc --readme README

.PHONY: clean
clean:
	pnpm run clean

.PHONY: submodules-update
submodules-update:
	git submodule update --recursive --remote

.PHONY: check
check:
	pnpm install -r --frozen-lockfile
	pnpm run compile
	pnpm run check

.PHONY: config-lib
config-lib:
	pnpm install --frozen-lockfile --filter @gnu-taler/taler-config-lib...
	cd ./packages/taler-config-lib/ && pnpm link -g

.PHONY: anastasis-webui
anastasis-webui:
	pnpm install --frozen-lockfile --filter . --filter @gnu-taler/anastasis-webui...
	pnpm run --filter @gnu-taler/anastasis-webui... build

.PHONY: anastasis-webui-dist
anastasis-webui-dist: anastasis-webui
	(cd packages/anastasis-webui/dist && zip -r - fonts ui.html) > anastasis-webui.zip


.PHONY: anastasis-webui-dev
anastasis-webui-dev:
	pnpm install --frozen-lockfile --filter @gnu-taler/anastasis-webui...
	pnpm run --filter @gnu-taler/anastasis-webui... dev

.PHONY: webextension
webextension:
	pnpm install --frozen-lockfile --filter @gnu-taler/taler-wallet-webextension...
	pnpm run --filter @gnu-taler/taler-wallet-webextension... compile
	cd ./packages/taler-wallet-webextension/ && ./pack.sh dev

.PHONY: webextension-dev
webextension-dev:
	pnpm install --frozen-lockfile --filter @gnu-taler/taler-wallet-webextension...
	pnpm run --filter @gnu-taler/taler-wallet-webextension... dev

.PHONY: lint
lint:
	./node_modules/.bin/eslint --ext '.js,.ts,.tsx' 'src'


install: compile
	@echo Please run \'make install\' from one of the directories in packages/\'
