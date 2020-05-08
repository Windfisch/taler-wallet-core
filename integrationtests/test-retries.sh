#!/bin/bash
# Script to check that the wallet retries operations when services are not reachable

source "common.sh"
normal_start_and_wait "retries"

# TODO try withdrawal when bank is down

echo "Withdraw TESTKUDOS"
taler-wallet-cli --wallet-db="$WALLET_DB" --no-throttle testing withdraw -e "$EXCHANGE_URL" -b "$BANK_URL" -a "TESTKUDOS:10" 2>>"$LOG" >>"$LOG"
BALANCE_1=$(get_balance)
echo "Balance after withdrawal: $BALANCE_1"
echo "Getting pay taler:// Uri"
PAY_URI=$(taler-wallet-cli testing gen-pay-uri -m "$MERCHANT_URL" -k sandbox -a "TESTKUDOS:1" -s "foo" | grep -E -o 'taler://.*')
echo "Trying to pay with exchange down, will fail"
kill "$EXCHANGE_PID" && sleep 1
ps -p "$EXCHANGE_PID" >"$LOG" && exit_error "exchange still alive"
taler-wallet-cli --wallet-db="$WALLET_DB" --no-throttle handle-uri --yes "$PAY_URI" 2>>"$LOG" >>"$LOG" && exit_error "could pay with exchange down"
echo "Re-launching exchange"
taler-exchange-httpd -c "$CONF" 2>taler-exchange-httpd.log &
EXCHANGE_PID=$!
echo -n "Wait for exchange to start"
wait_for_service "$EXCHANGE_URL"
echo "Retrying operations with exchange up"
taler-wallet-cli --wallet-db="$WALLET_DB" run-until-done 2>>"$LOG" >>"$LOG"
BALANCE_2=$(get_balance)
echo "Balance after re-tried payment: $BALANCE_2"
assert_less_than "$BALANCE_2" "$BALANCE_1"

echo "Getting pay taler:// Uri"
PAY_URI=$(taler-wallet-cli testing gen-pay-uri -m "$MERCHANT_URL" -k sandbox -a "TESTKUDOS:1" -s "foo" | grep -E -o 'taler://.*')
echo "Trying to pay with merchant down, will fail"
kill "$MERCHANT_PID" && sleep 1
ps -p "$MERCHANT_PID" >"$LOG" && exit_error "merchant still alive"
taler-wallet-cli --wallet-db="$WALLET_DB" --no-throttle handle-uri --yes "$PAY_URI" 2>>"$LOG" >>"$LOG" && exit_error "could pay with merchant down"
echo "Re-launching merchant"
taler-merchant-httpd -c "$CONF" -L INFO 2>taler-merchant-httpd.log &
MERCHANT_PID=$!
echo -n "Wait for merchant to start"
wait_for_service "$MERCHANT_URL"
echo "Retrying payment with merchant up"
taler-wallet-cli --wallet-db="$WALLET_DB" --no-throttle handle-uri --yes "$PAY_URI" 2>>"$LOG" >>"$LOG"
BALANCE_3=$(get_balance)
echo "Balance after re-tried payment: $BALANCE_3"
assert_less_than "$BALANCE_3" "$BALANCE_2"

exit_success
