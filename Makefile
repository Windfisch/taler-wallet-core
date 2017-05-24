src = src
poname = taler-wallet-webex

gulp = node_modules/gulp/bin/gulp.js
tsc = node_modules/typescript/bin/tsc
pogen = node_modules/pogen/pogen.js

.PHONY: src/i18n/strings.ts yarn-install

package-stable: i18n
	$(gulp) package-stable

package-unstable: i18n
	$(gulp) package-unstable

tsc: tsconfig.json yarn-install
	$(tsc)

yarn-install:
	yarn install

tsconfig.json: gulpfile.js yarn-install
	$(gulp) tsconfig

dist:
	$(gulp) srcdist

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
