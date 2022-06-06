echo clean
rm -rf dist
mkdir -p dist/fonts
cp \
	src/scss/fonts/XRXV3I6Li01BKofINeaE.ttf \
	src/scss/fonts/materialdesignicons-webfont-4.9.95.ttf \
	src/scss/fonts/materialdesignicons-webfont-4.9.95.woff \
	src/scss/fonts/materialdesignicons-webfont-4.9.95.woff2 \
	dist/fonts

echo css
pnpm exec sass -I . ./src/scss/main.scss dist/main.css &
echo js
pnpm exec esbuild --log-level=error --bundle src/main.ts --outdir=dist --target=es6 --loader:.svg=dataurl --format=iife --sourcemap --jsx-factory=h --jsx-fragment=Fragment --platform=browser &
wait -n
wait -n

echo html
cat ui.html \
	| sed -e '/ANASTASIS_SCRIPT_CONTENT/ {' -e 'r dist/main.js' -e 'd' -e '}' \
	| sed -e '/ANASTASIS_STYLE_CONTENT/ {' -e 'r dist/main.css' -e 'd' -e '}' \
	>dist/index.html
echo done
