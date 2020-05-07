#!/bin/bash
# Script to generate the basic database for auditor
# testing from a 'correct' interaction between exchange,
# wallet and merchant.

source "common.sh"
setup_config "base"
setup_services
launch_services
wait_for_services

# run wallet CLI
echo "Running wallet"
taler-wallet-cli testing integrationtest -e "$EXCHANGE_URL" -m "$MERCHANT_URL" -b "$BANK_URL"

echo "SUCCESS"
exit 0
