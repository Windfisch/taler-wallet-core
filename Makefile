name=taler-wallet
version=0.1
xpi=${name}-${version}.xpi

xpi:
	cd extension && zip ../${xpi} $$(git ls-files)
