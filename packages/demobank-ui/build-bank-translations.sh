#!/bin/bash

set -eu

# NOTE: the <Translate> node somehow didn't get
# the strings extracted.  Only i18n`` did

function build {
  POTGEN=node_modules/@gnu-taler/pogen/bin/pogen
  PACKAGE_NAME=$1

  find src/ \( -type f -name "*.ts" -or -name "*.tsx" \) ! -name "*.d.ts" \
      | xargs node $POTGEN \
      | msguniq \
      | msgmerge src/i18n/poheader - \
      > src/i18n/$PACKAGE_NAME.pot
  
  # merge existing translations: fails when NO .po-files were found.
  for pofile in $(ls src/i18n/*.po 2> /dev/null || true); do 
    echo merging $pofile; 
    msgmerge -o $pofile $pofile src/i18n/$PACKAGE_NAME.pot; 
  done;
  
  # generate .ts file containing all translations
  cat src/i18n/strings-prelude > src/i18n/strings.ts
  for pofile in $(ls src/i18n/*.po 2> /dev/null || true); do \
    echo appending $pofile; \
    ./contrib/po2ts $pofile >> src/i18n/strings.ts; \
  done; 
}

build bank
