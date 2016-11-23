src = src
ts = $(shell git ls-files $(src) | grep '\.tsx\?$$')
poname = taler-wallet-webex

gulp = node_modules/gulp/bin/gulp.js
tsc = node_modules/typescript/bin/tsc
po2json = node_modules/po2json/bin/po2json

.PHONY: pogen src/i18n/strings.js yarn-install

package-stable: tsc i18n yarn-install
	$(gulp) package-stable

package-unstable: tsc i18n yarn-install
	$(gulp) package-unstable

tsc: tsconfig.json yarn-install
	$(tsc)

yarn-install:
	yarn install

tsconfig.json: gulpfile.js yarn-install
	$(gulp) tsconfig

i18n: pogen msgmerge src/i18n/strings.js

pogen/pogen.js: pogen/pogen.ts pogen/tsconfig.json
	cd pogen; ../$(tsc)

pogen: $(ts) pogen/pogen.js yarn-install
	find $(src) \( -name '*.ts' -or -name '*.tsx' \) ! -name '*.d.ts' \
	  | xargs node pogen/pogen.js \
	  | msguniq \
	  | msgmerge src/i18n/poheader - \
	  > src/i18n/$(poname).pot

msgmerge:
	@for pofile in src/i18n/*.po; do \
	  echo merging $$pofile; \
	  msgmerge -o $$pofile $$pofile src/i18n/$(poname).pot; \
	done; \

dist:
	$(gulp) srcdist

src/i18n/strings.js: # $(ts)
	cp src/i18n/strings-prelude.js src/i18n/strings.js
	for pofile in src/i18n/*.po; do \
	  b=`basename $$pofile`; \
	  lang=$${b%%.po}; \
	  $(po2json) -F -f jed1.x -d $$lang $$pofile $$pofile.json; \
	  (echo -n "i18n.strings['$$lang'] = "; cat $$pofile.json; echo ';') >> $@; \
	done

