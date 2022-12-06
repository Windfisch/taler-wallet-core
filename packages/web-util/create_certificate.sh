#!/usr/bin/env bash
set -eu
org=localhost-ca
domain=localhost

rm -rf keys
mkdir keys
cd keys

openssl genpkey -algorithm RSA -out ca.key
openssl req -x509 -key ca.key -out ca.crt \
    -subj "/CN=$org/O=$org"

openssl genpkey -algorithm RSA -out "$domain".key
openssl req -new -key "$domain".key -out "$domain".csr \
    -subj "/CN=$domain/O=$org"

openssl x509 -req -in "$domain".csr -days 365 -out "$domain".crt \
    -CA ca.crt -CAkey ca.key -CAcreateserial \
    -extfile <(cat <<END
basicConstraints = CA:FALSE
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid,issuer
subjectAltName = DNS:$domain
END
    )

sudo cp ca.crt /usr/local/share/ca-certificates/testing.crt
sudo update-ca-certificates


echo '
## Chrome  
1. go to chrome://settings/certificates
2. tab "authorities"
3. button "import" 
4. choose "ca.crt"
5. trust for identify websites

## Firefox
1. go to about:preferences#privacy
2. button "view certificates"
3. button "import"
4. choose "ca.crt"
5. trust for identify websites
'

echo done!
