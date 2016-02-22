src = lib background content_scripts pages

gulp = node_modules/gulp/bin/gulp.js
tsc = node_modules/typescript/bin/tsc
po2json = node_modules/po2json/bin/po2json

.PHONY: taler.po lib/i18n.json

package-stable: tsc i18n
	$(gulp) package-stable

package-unstable: tsc i18n
	$(gulp) package-unstable

tsc: tsconfig.json node_modules
	$(tsc)

tsconfig.json: gulpfile.js node_modules
	$(gulp) tsconfig

i18n: lib/i18n.json

taler.po: node_modules
	for f in `find $(src) -name '*.ts' -or -name '*.tsx'`; do echo $$f; pogen/pogen.js $$f > `dirname $$f`/`basename $$f .ts`.po; done
	touch $@
	msgcat `find $(src) -name '*.po'` | msgmerge -o $@ $@ -

lib/i18n.json: taler.po node_modules
	$(po2json) $< $@

node_modules:
	npm install .
