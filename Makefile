src = src
poname = taler-wallet-webex

gulp = node_modules/gulp/bin/gulp.js
tsc = node_modules/typescript/bin/tsc
pogen = node_modules/pogen/bin/pogen.js
typedoc = node_modules/typedoc/bin/typedoc
ava = node_modules/ava/cli.js
nyc = node_modules/nyc/bin/nyc.js
tslint = node_modules/tslint/bin/tslint

-include config.mk

.PHONY: tsc
tsc: tsconfig.json yarn-install
	$(tsc)

.PHONY: webex-stable
webex-stable: i18n
	$(gulp) stable

.PHONY: webex-unstable
webex-unstable: i18n
	$(gulp) unstable

tsconfig.json: gulpfile.js yarn-install
	$(gulp) tsconfig

.PHONY: dist
dist:
	$(gulp) srcdist

# make documentation from docstrings
.PHONY: typedoc
typedoc:
	$(typedoc) --out build/typedoc --readme README

.PHONY: clean
clean:
	rm -rf dist/ config.mk

.PHONY: check
check: tsc yarn-install
	find dist/node -name '*-test.js' | xargs $(ava)

.PHONY: coverage
coverage: tsc yarn-install
	$(nyc) --all $(ava) 'build/**/*-test.js'

.PHONY: lint
lint: tsc yarn-install
	$(tslint) -e src/i18n/strings.ts --project tsconfig.json -t verbose 'src/**/*.ts' 'src/**/*.tsx'

.PHONY: yarn-install
yarn-install:
	$(yarnexe) install


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
	$(gulp) po2js

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
	npm install -g --prefix $(prefix) .
endif

.PHONY: watch
watch: tsconfig.json

	./node_modules/.bin/webpack --watch
