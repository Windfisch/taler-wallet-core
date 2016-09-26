src = lib background content_scripts pages popup
ts = $(shell git ls-files $(src) | grep '\.tsx\?$$')
poname = taler-wallet-webex

gulp = node_modules/gulp/bin/gulp.js
tsc = node_modules/typescript/bin/tsc
po2json = node_modules/po2json/bin/po2json

.PHONY: node_modules pogen i18n/strings.js

package-stable: tsc i18n
	$(gulp) package-stable

package-unstable: tsc i18n
	$(gulp) package-unstable

tsc: tsconfig.json node_modules
	$(tsc)

tsconfig.json: gulpfile.js node_modules
	$(gulp) tsconfig

i18n: pogen i18n/strings.js

pogen/pogen.js: pogen/pogen.ts pogen/tsconfig.json node_modules
	cd pogen; ../$(tsc)

pogen: $(ts) pogen/pogen.js node_modules
	find $(src) \( -name '*.ts' -or -name '*.tsx' \) ! -name '*.d.ts' \
	  | xargs node pogen/pogen.js \
	  | msguniq \
	  | msgmerge i18n/poheader - \
	  > i18n/$(poname).pot

msgmerge:
	@for pofile in i18n/*.po; do \
	  echo merging $$pofile; \
	  msgmerge -o $$pofile $$pofile i18n/$(poname).pot; \
	done; \

dist: node_modules
	$(gulp) srcdist

appdist:
	$(gulp) appdist

i18n/strings.js: # $(ts) node_modules
	cp i18n/strings-prelude.js i18n/strings.js
	for pofile in i18n/*.po; do \
	  b=`basename $$pofile`; \
	  lang=$${b%%.po}; \
	  $(po2json) -F -f jed1.x -d $$lang $$pofile $$pofile.json; \
	  (echo -n "i18n.strings['$$lang'] = "; cat $$pofile.json; echo ';') >> $@; \
	done


node_modules:
	npm install .
