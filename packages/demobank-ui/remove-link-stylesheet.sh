# This script has been placed in the public domain.

FILE=$(ls build/bundle.*.css)
BUNDLE=${FILE#build}
grep -q '<link href="'$BUNDLE'" rel="stylesheet">' build/index.html || { echo bundle $BUNDLE not found in index.html; exit 1; }
echo -n Removing link from index.html ...
sed 's_<link href="'$BUNDLE'" rel="stylesheet">__' -i build/index.html
echo done
