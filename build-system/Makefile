# This Makefile has been placed in the public domain.

src = src
poname = taler-wallet-webex

tsc = node_modules/typescript/bin/tsc
pogen = node_modules/@gnu-taler/pogen/bin/pogen.js
typedoc = node_modules/typedoc/bin/typedoc
ava = node_modules/.bin/ava
nyc = node_modules/nyc/bin/nyc.js
git-archive-all = ./build-system/taler-build-scripts/archive-with-submodules/git_archive_all.py

include ./build-system/config.mk

.PHONY: dist
dist:
	$(git-archive-all) --include ./configure taler-wallet-$(shell git describe --tags --abbrev=0).tar.gz

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

.PHONY: compile
compile:
	pnpm install -r --frozen-lockfile
	pnpm run compile

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
	cd ./packages/taler-wallet-webextension/ && ./pack.sh

.PHONY: webextension-dev
webextension-dev:
	pnpm install --frozen-lockfile --filter @gnu-taler/taler-wallet-webextension...
	pnpm run --filter @gnu-taler/taler-wallet-webextension... dev

.PHONY: i18n
i18n: compile
	# extract translatable strings
	find $(src) \( -name '*.ts' -or -name '*.tsx' \) ! -name '*.d.ts' \
	  | xargs node $(pogen) \
	  | msguniq \
	  | msgmerge src/i18n/poheader - \
	  > src/i18n/$(poname).pot
	# merge existing translations
	@for pofile in src/i18n/*.po; do \
	  echo merging $$pofile; \
	  msgmerge -o $$pofile $$pofile src/i18n/$(poname).pot; \
	done;
	# generate .ts file containing all translations
	cat src/i18n/strings-prelude > src/i18n/strings.ts
	@for pofile in src/i18n/*.po; do \
	  echo appending $$pofile; \
	  ./contrib/po2ts $$pofile >> src/i18n/strings.ts; \
	done;
	./node_modules/.bin/prettier --config .prettierrc --write src/i18n/strings.ts

# Some commands are only available when ./configure has been run

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
	install ./packages/taler-wallet-cli/dist/taler-wallet-cli.js $(install_target)/node_modules/taler-wallet-cli/dist/
	install ./packages/taler-wallet-cli/dist/taler-wallet-cli.js.map $(install_target)/node_modules/taler-wallet-cli/dist/
	install ./packages/taler-wallet-cli/bin/taler-wallet-cli $(install_target)/node_modules/taler-wallet-cli/bin/
	ln -sft $(prefix)/bin $(install_target)/node_modules/taler-wallet-cli/bin/taler-wallet-cli
endif

.PHONY: lint
lint:
	./node_modules/.bin/eslint --ext '.js,.ts,.tsx' 'src'
