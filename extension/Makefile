src = lib background content_scripts pages popup
ts = $(shell git ls-files $(src) | grep '\.tsx\?$$')
langs = en-US de-DE

gulp = node_modules/gulp/bin/gulp.js
tsc = node_modules/typescript/bin/tsc
po2json = node_modules/po2json/bin/po2json

.PHONY: pogen lib/i18n-strings.js

package-stable: tsc i18n
	$(gulp) package-stable

package-unstable: tsc i18n
	$(gulp) package-unstable

tsc: tsconfig.json node_modules
	$(tsc)

tsconfig.json: gulpfile.js node_modules
	$(gulp) tsconfig

lib/vendor/jed.js: node_modules
	test -e lib/vendor/jed.js || ln -s ../../node_modules/jed/jed.js lib/vendor/

i18n: lib/i18n-strings.js lib/vendor/jed.js

pogen/pogen.js: pogen/pogen.ts pogen/tsconfig.json node_modules
	cd pogen; ../$(tsc)

pogen: $(ts) pogen/pogen.js node_modules
	for ts in $(ts); do \
	  echo $$ts; \
	  node pogen/pogen.js $$ts > `dirname $$ts`/`basename $$ts .ts`.po; \
	done

	for lang in $(langs); do \
	  echo $$lang; \
	  test -e taler-$$lang.po || cp header.po taler-$$lang.po; \
	  msgcat `find $(src) -name '*.po'` | msgmerge -o taler-$$lang.po taler-$$lang.po -; \
	done

lib/i18n-strings.js: $(ts) pogen node_modules
	for lang in $(langs); do \
	  $(po2json) -f jed1.x -d $$lang taler-$$lang.po taler-$$lang.json; \
	done

	truncate -s0 $@
	for lang in $(langs); do \
	  (echo -n "i18n.strings['$$lang'] = "; cat taler-$$lang.json; echo ';') >> $@; \
	done

node_modules:
	npm install .
