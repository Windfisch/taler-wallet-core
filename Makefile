src = src
poname = taler-wallet-webex

gulp = node_modules/gulp/bin/gulp.js
tsc = node_modules/typescript/bin/tsc
pogen = node_modules/pogen/bin/pogen.js
typedoc = node_modules/typedoc/bin/typedoc
ava = node_modules/ava/cli.js
nyc = node_modules/nyc/bin/nyc.js
tslint = node_modules/tslint/bin/tslint


.PHONY: package-stable
package-stable: i18n
	$(gulp) stable

.PHONY: package-unstable
package-unstable: i18n
	$(gulp) unstable

.PHONY: tsc
tsc: tsconfig.json yarn-install
	$(tsc)

.PHONY: yarn-install
yarn-install:
	yarn install

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
	rm -rf build/
	rm -rf dist/

.PHONY: check
check: tsc yarn-install
	$(ava) 'build/**/*-test.js'

.PHONY: coverage
coverage: tsc yarn-install
	$(nyc) --all $(ava) 'build/**/*-test.js'

.PHONY: lint
lint: tsc yarn-install
	$(tslint) -e src/i18n/strings.ts --project tsconfig.json -t verbose 'src/**/*.ts' 'src/**/*.tsx'

.PHONY: yarn-install
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
