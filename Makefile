src = src
poname = taler-wallet-webex

tsc = node_modules/typescript/bin/tsc
pogen = node_modules/pogen/bin/pogen.js
typedoc = node_modules/typedoc/bin/typedoc
ava = node_modules/.bin/ava
nyc = node_modules/nyc/bin/nyc.js

include config.mk

.PHONY: compile
compile:
	pnpm i
	pnpm run compile

.PHONY: dist
dist:
	git archive --format=tar.gz HEAD -o taler-wallet.tar.gz

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
check: compile
	pnpm run check

.PHONY: webextensions
webextensions: rollup
	./webextension/pack.sh

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
install: # compile
	install -d $(install_target)/node_modules/taler-wallet-cli
	install -d $(install_target)/node_modules/taler-wallet-cli/bin
	install -d $(install_target)/node_modules/taler-wallet-cli/dist
	install ./packages/taler-wallet-cli/dist/taler-wallet-cli.js $(install_target)/node_modules/taler-wallet-cli/dist/
	install ./packages/taler-wallet-cli/bin/taler-wallet-cli $(install_target)/node_modules/taler-wallet-cli/bin/
	ln -sft $(prefix)/bin $(install_target)/node_modules/taler-wallet-cli/bin/taler-wallet-cli
endif

.PHONY: rollup
rollup: compile
	./node_modules/.bin/rollup -c

.PHONY: lint
lint:
	./node_modules/.bin/eslint --ext '.js,.ts,.tsx' 'src'
