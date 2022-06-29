#!/usr/bin/env bash

echo clean
rm -rf dist
mkdir -p dist/fonts
cp \
	src/scss/fonts/XRXV3I6Li01BKofINeaE.ttf \
	src/scss/fonts/materialdesignicons-webfont-4.9.95.ttf \
	src/scss/fonts/materialdesignicons-webfont-4.9.95.woff \
	src/scss/fonts/materialdesignicons-webfont-4.9.95.woff2 \
	dist/fonts

VERSION=$(jq -r .version package.json)
GIT_HASH=$(git rev-parse --short HEAD)

function build_css() {
	pnpm exec sass -I . ./src/scss/main.scss dist/main.css
}
function build_js() {
	pnpm exec esbuild --log-level=error --define:process.env.__VERSION__=\"${VERSION}\" --define:process.env.__GIT_HASH__=\"${GIT_HASH}\"  --bundle $1 --outdir=dist --target=es6 --loader:.svg=dataurl --format=iife --sourcemap --jsx-factory=h --jsx-fragment=Fragment --platform=browser --minify
}

function build_html() {
	cat html/$1.html \
	  | sed -e '/ANASTASIS_SCRIPT_CONTENT/ {' -e 'r dist/main.js' -e 'd' -e '}' \
	  | sed -e '/ANASTASIS_STYLE_CONTENT/ {' -e 'r dist/main.css' -e 'd' -e '}' \
	  >dist/$1.html
}

function cleanup {
 trap - SIGHUP SIGINT SIGTERM SIGQUIT
 echo -n "Cleaning up... "
 wait
 kill -- -$$
 exit 1
}
trap cleanup SIGHUP SIGINT SIGTERM SIGQUIT

set -e
echo compile
build_css &
build_js src/main.ts &
build_js src/main.test.ts &
for file in $(find src/ -name test.ts); do build_js $file; done &
wait -n
wait -n
wait -n
wait -n
pnpm run --silent test -- -R dot

echo html
build_html ui
build_html ui-dev

if [ "WATCH" == "$1" ]; then

  echo watch mode
  echo Writing any file in the src directory will trigger a browser reload.
  echo Be sure that the watcher server is running.
  echo ./watch/serve.sh
  inotifywait -e close_write -r src -q -m | while read line; do
    echo $(date) $line
    build_js src/main.ts
    build_html ui-dev
    ./watch/send.sh '{"type":"RELOAD"}'
  done;
fi
