#!/bin/bash
# Script to check that the wallet can handle tip URIs and actually process the tips

source "common.sh"
normal_start_and_wait "tip"

# TODO fund exchange tipping reserve: 404 tipping reserve unknown at exchange
TIP_URI=$(taler-wallet-cli --wallet-db="$WALLET_DB" --no-throttle testing gen-tip-uri \
    -m "$MERCHANT_URL" -k sandbox -a "TESTKUDOS:5" 2>>"$LOG" | grep -E -m 1 -o "taler://tip.*insecure=1")
echo -n "Balance after tip: "
taler-wallet-cli --wallet-db="$WALLET_DB" balance 2>>"$LOG"
echo "Handling tip: $TIP_URI"
taler-wallet-cli --wallet-db="$WALLET_DB" --no-throttle handle-uri "$TIP_URI" 2>"$LOG"
taler-wallet-cli --wallet-db="$WALLET_DB" run-until-done 2>>"$LOG" >>"$LOG"
echo -n "Balance after first tip: "
taler-wallet-cli --wallet-db="$WALLET_DB" balance 2>>"$LOG"

echo "SUCCESS"
exit 0
