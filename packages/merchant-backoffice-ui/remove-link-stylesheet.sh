# This script has been placed in the public domain.

FILE=$(ls single/bundle.*.css)
BUNDLE=${FILE#single}
grep -q '<link href="'$BUNDLE'" rel="stylesheet">' single/index.html || { echo bundle $BUNDLE not found in index.html; exit 1; }
echo -n Removing link from index.html ...
sed 's_<link href="'$BUNDLE'" rel="stylesheet">__' -i single/index.html
echo done
