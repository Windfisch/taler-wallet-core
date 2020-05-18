#!/bin/bash

function setup_config() {
    set -eu

    echo -n "Testing for taler-bank-manage"
    taler-bank-manage -h >/dev/null </dev/null || exit_skip " MISSING"
    echo " FOUND"
    echo -n "Testing for taler-wallet-cli"
    taler-wallet-cli -v >/dev/null </dev/null || exit_skip " MISSING"
    echo " FOUND"
    echo -n "Testing for taler-merchant-httpd"
    # TODO "taler-merchant-httpd -v" should not return an error
    [[ "$(taler-merchant-httpd -v)" =~ "taler-merchant-httpd v" ]] || exit_skip " MISSING"
    echo " FOUND"
    bc -v >/dev/null </dev/null || exit_error "Please install bc"

    trap shutdown_services EXIT

    SCRIPT_NAME=$1

    # Where do we write the result?
    export BASEDB=${1:-"auditor-${SCRIPT_NAME}db"}

    # Name of the Postgres database we will use for the script.
    # Will be dropped, do NOT use anything that might be used
    # elsewhere
    export TARGET_DB=taler-auditor-${SCRIPT_NAME}db

    # Configuration file will be edited, so we create one
    # from the template.
    export CONF=test-${SCRIPT_NAME}.conf
    cp template.conf "$CONF"

    export LOG=test-${SCRIPT_NAME}.log
    rm "$LOG" 2>/dev/null || true

    export WALLET_DB=wallet-${SCRIPT_NAME}.json
    rm "$WALLET_DB" 2>/dev/null || true

    # Clean up
    DATA_DIR=$(taler-config -f -c "$CONF" -s PATHS -o TALER_HOME)
    rm -rf "$DATA_DIR" || true

    # reset database
    dropdb "$TARGET_DB" >/dev/null 2>/dev/null || true
    createdb "$TARGET_DB" || exit_skip "Could not create database $TARGET_DB"

    # obtain key configuration data
    MASTER_PRIV_FILE=$(taler-config -f -c "$CONF" -s EXCHANGE -o MASTER_PRIV_FILE)
    MASTER_PRIV_DIR=$(dirname "$MASTER_PRIV_FILE")
    mkdir -p "$MASTER_PRIV_DIR"
    gnunet-ecc -g1 "$MASTER_PRIV_FILE" >/dev/null
    MASTER_PUB=$(gnunet-ecc -p "$MASTER_PRIV_FILE")
    EXCHANGE_URL=$(taler-config -c "$CONF" -s EXCHANGE -o BASE_URL)
    MERCHANT_PORT=$(taler-config -c "$CONF" -s MERCHANT -o PORT)
    # shellcheck disable=SC2034
    MERCHANT_URL=http://localhost:${MERCHANT_PORT}/
    BANK_PORT=$(taler-config -c "$CONF" -s BANK -o HTTP_PORT)
    # shellcheck disable=SC2034
    BANK_URL=http://localhost:${BANK_PORT}/
    AUDITOR_URL=http://localhost:8083/

    # patch configuration
    taler-config -c "$CONF" -s exchange -o MASTER_PUBLIC_KEY -V "$MASTER_PUB"
    taler-config -c "$CONF" -s merchant-exchange-default -o MASTER_KEY -V "$MASTER_PUB"
    taler-config -c "$CONF" -s exchangedb-postgres -o CONFIG -V "postgres:///$TARGET_DB"
    taler-config -c "$CONF" -s auditordb-postgres -o CONFIG -V "postgres:///$TARGET_DB"
    taler-config -c "$CONF" -s merchantdb-postgres -o CONFIG -V "postgres:///$TARGET_DB"
    taler-config -c "$CONF" -s bank -o database -V "postgres:///$TARGET_DB"
}

function setup_services() {
    # setup exchange
    echo "Setting up exchange"
    taler-exchange-dbinit -c "$CONF"
    taler-exchange-wire -c "$CONF" 2>taler-exchange-wire.log
    taler-exchange-keyup -L INFO -c "$CONF" -o e2a.dat 2>taler-exchange-keyup.log

    # setup auditor
    echo "Setting up auditor"
    taler-auditor-dbinit -c "$CONF"
    taler-auditor-exchange -c "$CONF" -m "$MASTER_PUB" -u "$EXCHANGE_URL"
    taler-auditor-sign -c "$CONF" -u $AUDITOR_URL -r e2a.dat -o a2e.dat -m "$MASTER_PUB"
    rm -f e2a.dat

    # provide auditor's signature to exchange
    ABD=$(taler-config -c "$CONF" -s EXCHANGEDB -o AUDITOR_BASE_DIR -f)
    mkdir -p "$ABD"
    mv a2e.dat "$ABD"
}

function launch_services() {
    # Launch services
    echo "Launching services"
    taler-bank-manage-testing "$CONF" "postgres:///$TARGET_DB" serve-http &>bank-"$SCRIPT_NAME".log &
    taler-exchange-httpd -c "$CONF" 2>taler-exchange-httpd.log &
    # shellcheck disable=SC2034
    EXCHANGE_PID=$!
    taler-merchant-httpd -c "$CONF" -L INFO 2>taler-merchant-httpd.log &
    # shellcheck disable=SC2034
    MERCHANT_PID=$!
    taler-exchange-wirewatch -c "$CONF" 2>taler-exchange-wirewatch.log &
    taler-auditor-httpd -c "$CONF" 2>taler-auditor-httpd.log &
}

function wait_for_services() {
    # Wait for bank to be available (usually the slowest)
    for _ in $(seq 1 50); do
        echo -n "."
        sleep 0.2
        OK=0
        wget "$BANK_URL" -o /dev/null -O /dev/null >/dev/null || continue
        OK=1
        break
    done
    if [ 1 != $OK ]; then
        exit_skip "Failed to launch bank"
    fi
    # Wait for all other services to be available
    for _ in $(seq 1 50); do
        echo -n "."
        sleep 0.1
        OK=0
        wget "$EXCHANGE_URL" -o /dev/null -O /dev/null >/dev/null || continue
        wget "$MERCHANT_URL" -o /dev/null -O /dev/null >/dev/null || continue
        wget "$AUDITOR_URL" -o /dev/null -O /dev/null >/dev/null || continue
        OK=1
        break
    done
    if [ 1 != $OK ]; then
        shutdown_services
        exit_skip "Failed to launch services"
    fi
    echo " DONE"
}

function normal_start_and_wait() {
    setup_config "$1"
    setup_services
    launch_services
    wait_for_services
}

# provide the service URL as first parameter
function wait_for_service() {
    for _ in $(seq 1 50); do
        echo -n "."
        sleep 0.1
        wget "$1" -o /dev/null -O /dev/null >/dev/null || continue
        echo " DONE"
        break
    done
}

function get_balance() {
    taler-wallet-cli --wallet-db="$WALLET_DB" balance 2>>"$LOG"
}

function assert_less_than() {
    AMOUNT_1=${1//TESTKUDOS:/}
    AMOUNT_2=${2//TESTKUDOS:/}
    if (($(echo "$AMOUNT_1 >= $AMOUNT_2" | bc -l))); then
        exit_error "$1 is not lower than $2"
    fi
}

function assert_greater_than() {
    AMOUNT_1=${1//TESTKUDOS:/}
    AMOUNT_2=${2//TESTKUDOS:/}
    if (($(echo "$AMOUNT_1 <= $AMOUNT_2" | bc -l))); then
        exit_error "$1 is not greater than $2"
    fi
}

function assert_equal() {
    [[ "$1" == "$2" ]] || exit_error "$1 is not equal to $2"
}

function shutdown_services() {
    echo "Shutting down services"
    jobs -p | xargs --no-run-if-empty kill || true
    wait

    # clean up
    echo "Final clean up"
    dropdb "$TARGET_DB" >/dev/null 2>/dev/null || true

    rm "$WALLET_DB" 2>/dev/null || true

    rm -rf "$DATA_DIR" || true
    rm "$CONF"
}

# Exit, with status code "skip" (no 'real' failure)
function exit_skip() {
    echo "$1"
    exit 77
}

function exit_error() {
    echo -e "\033[0;31mError: $1\033[0m"
    exit 1
}

function exit_success() {
    echo -e "\033[0;32mSUCCESS \o/\033[0m"
    exit 0
}
