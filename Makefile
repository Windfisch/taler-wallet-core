name = taler-wallet
version = $(shell grep '"version"' extension/manifest.json | sed 's/.*"\([0-9.]\+\)".*/\1/')
xpi = ${name}-${version}.xpi

xpi:
	cd extension && zip ../${xpi} $$(git ls-files)
