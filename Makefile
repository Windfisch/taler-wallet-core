src = lib background content_scripts pages popup
ts = $(shell git ls-files $(src) | grep '\.tsx\?$$')
langs = en-US de-DE fr-FR it-IT
poname = taler-wallet

gulp = node_modules/gulp/bin/gulp.js
tsc = node_modules/typescript/bin/tsc
po2json = node_modules/po2json/bin/po2json

.PHONY: node_modules pogen lib/i18n-strings.js

package-stable: tsc i18n
	$(gulp) package-stable

package-unstable: tsc i18n
	$(gulp) package-unstable

tsc: tsconfig.json node_modules
	$(tsc)

tsconfig.json: gulpfile.js node_modules
	$(gulp) tsconfig

i18n: pogen lib/i18n-strings.js

pogen/pogen.js: pogen/pogen.ts pogen/tsconfig.json node_modules
	cd pogen; ../$(tsc)

pogen: $(ts) pogen/pogen.js node_modules
	for ts in $(ts); do \
	  echo $$ts; \
	  node pogen/pogen.js $$ts > `dirname $$ts`/`basename $$ts .ts`.po; \
	done

	pos=`find $(src) -name '*.po'`; \
	for lang in $(langs); do \
	  echo $$lang; \
	  test -e $(poname)-$$lang.po || cp header.po $(poname)-$$lang.po; \
	  for po in $$pos; do \
	    msguniq -o $$po $$po; \
	  done; \
	  msgcat $$pos | msgmerge -o $(poname)-$$lang.po $(poname)-$$lang.po -; \
	done; \
	rm $$pos

dist:
	$(gulp) srcdist

appdist:
	$(gulp) appdist

lib/i18n-strings.js: $(ts) node_modules
	truncate -s0 $@
	for lang in $(langs); do \
	  $(po2json) -F -f jed1.x -d $$lang $(poname)-$$lang.po $(poname)-$$lang.json; \
	  (echo -n "i18n.strings['$$lang'] = "; cat $(poname)-$$lang.json; echo ';') >> $@; \
	  rm $(poname)-$$lang.json; \
	done

node_modules:
	npm install .
