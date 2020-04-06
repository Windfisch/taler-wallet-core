src = src
poname = taler-wallet-webex

tsc = node_modules/typescript/bin/tsc
pogen = node_modules/pogen/bin/pogen.js
typedoc = node_modules/typedoc/bin/typedoc
ava = node_modules/.bin/ava
nyc = node_modules/nyc/bin/nyc.js

include config.mk

.PHONY: tsc
tsc: yarn-install
	$(tsc)

.PHONY: dist
dist:
	git archive --format=tar.gz HEAD -o taler-wallet.tar.gz

# make documentation from docstrings
.PHONY: typedoc
typedoc:
	$(typedoc) --out dist/typedoc --readme README

.PHONY: clean
clean:
	rm -rf dist/ config.mk

.PHONY: submodules-update
submodules-update:
	git submodule update --recursive --remote

.PHONY: check
check: tsc yarn-install
	$(ava)

.PHONY: coverage
coverage: tsc yarn-install
	$(nyc) --all $(ava) 'build/**/*-test.js'

.PHONY: yarn-install
yarn-install:
	$(yarn) install

.PHONY: webextensions
webextensions: rollup
	rm -rf dist/wx
	mkdir dist/wx
	cp webextension/manifest.json dist/wx/
	cp -r webextension/static/* dist/wx/
	cp -r dist/webextension/* dist/wx/

.PHONY: i18n
i18n: yarn-install
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
	./contrib/po2ts

# Some commands are only available when ./configure has been run

ifndef prefix
.PHONY: warn-noprefix install
warn-noprefix:
	@echo "no prefix configured, did you run ./configure?"
install: warn-noprefix
else
.PHONY: install
install: tsc
	@echo "installing to" $(prefix)
	$(yarn) global add file://$(CURDIR) --prefix $(prefix)
endif

.PHONY: rollup
rollup: tsc
	./node_modules/.bin/rollup -c

