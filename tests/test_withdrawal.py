#!/usr/bin/env python3

from taler.util.amount import Amount

from tests import check_single_balance


def test_withdrawal(exchange, bank, wallet):
    # assert that we start with no transactions
    result = wallet.cmd("getTransactions")
    assert not result["transactions"]

    # test withdrawal
    amount_raw = "TESTKUDOS:5"
    wallet.testing_withdraw(amount_raw, exchange.url, bank.url)

    # check that balance is correct
    result = wallet.cmd("getBalances")
    amount_effective = Amount("TESTKUDOS", 4, 84000000).stringify()
    check_single_balance(result["balances"], amount_effective)

    # assert that withdrawal shows up properly in transactions
    result = wallet.cmd("getTransactions")
    assert len(result["transactions"]) == 1
    transaction = result["transactions"][0]
    assert transaction["type"] == "withdrawal"
    assert transaction["amountEffective"] == amount_effective
    assert transaction["amountRaw"] == amount_raw
    assert transaction["exchangeBaseUrl"] == exchange.url
    assert not transaction["pending"]
    withdrawal_details = transaction["withdrawalDetails"]
    assert withdrawal_details["type"] == "manual-transfer"
    payto_list = ["payto://x-taler-bank/localhost/Exchange"]
    assert withdrawal_details["exchangePaytoUris"] == payto_list

    # get a withdrawal URI
    uri = wallet.gen_withdraw_uri(amount_raw, bank.url)
    assert uri.startswith("taler+http://withdraw")

    # get withdrawal details from URI
    result = wallet.cmd("getWithdrawalDetailsForUri", {"talerWithdrawUri": uri})
    assert result["amount"] == amount_raw
    assert result["defaultExchangeBaseUrl"] == exchange.url
    assert len(result["possibleExchanges"]) == 1
    assert result["possibleExchanges"][0]["exchangeBaseUrl"] == exchange.url
    assert result["possibleExchanges"][0]["currency"] == "TESTKUDOS"
    assert result["possibleExchanges"][0]["paytoUris"] == payto_list

    # check withdrawal details for amount
    request = {"exchangeBaseUrl": exchange.url, "amount": amount_raw}
    result = wallet.cmd("getWithdrawalDetailsForAmount", request)
    assert result["amountRaw"] == amount_raw
    assert result["amountEffective"] == amount_effective
    assert result["paytoUris"] == payto_list
    assert not result["tosAccepted"]

    # get ToS
    result = wallet.cmd("getExchangeTos", {"exchangeBaseUrl": exchange.url})
    assert result["currentEtag"] == exchange.terms_etag
    assert result["tos"] == exchange.tos

    # accept ToS
    request = {"exchangeBaseUrl": exchange.url, "etag": exchange.terms_etag}
    wallet.cmd("setExchangeTosAccepted", request)

    # check that ToS are now shown as accepted
    request = {"exchangeBaseUrl": exchange.url, "amount": amount_raw}
    result = wallet.cmd("getWithdrawalDetailsForAmount", request)
    assert result["tosAccepted"]

    # accept withdrawal
    request = {"exchangeBaseUrl": exchange.url, "talerWithdrawUri": uri}
    result = wallet.cmd("acceptBankIntegratedWithdrawal", request)
    assert result["confirmTransferUrl"].startswith(bank.url + "/confirm-withdrawal/")
    confirm_url = result["confirmTransferUrl"]

    # check that balance is correct
    result = wallet.cmd("getBalances")
    # TODO pendingIncoming and hasPendingTransactions are wrong, right?
    print(result)
    # check_single_balance(result["balances"], amount_effective, amount_effective, has_pending=True)

    # assert that 2nd withdrawal shows up properly in transactions
    result = wallet.cmd("getTransactions")
    assert len(result["transactions"]) == 2
    transaction = result["transactions"][0]
    assert transaction["type"] == "withdrawal"
    assert transaction["amountEffective"] == amount_effective
    assert transaction["amountRaw"] == amount_raw
    assert transaction["exchangeBaseUrl"] == exchange.url
    assert transaction["pending"]
    withdrawal_details = transaction["withdrawalDetails"]
    assert withdrawal_details["type"] == "taler-bank-integration-api"
    assert not withdrawal_details["confirmed"]
    assert withdrawal_details["bankConfirmationUrl"] == confirm_url

    # new withdrawal is newer than old one
    timestamp0 = result["transactions"][0]["timestamp"]["t_ms"]
    timestamp1 = result["transactions"][1]["timestamp"]["t_ms"]
    assert timestamp0 > timestamp1

    # one more manual withdrawal
    request = {"exchangeBaseUrl": exchange.url, "amount": amount_raw}
    result = wallet.cmd("acceptManualWithdrawal", request)
    assert len(result["exchangePaytoUris"]) == 1
    result["exchangePaytoUris"][0].startswith(payto_list[0])

    # check that balance is correct
    result = wallet.cmd("getBalances")
    # TODO pendingIncoming and hasPendingTransactions are wrong, right?
    print(result)
    # check_single_balance(result["balances"], amount_effective, TODO, has_pending=True)

    # assert that 3nd withdrawal shows up properly in transactions
    result = wallet.cmd("getTransactions")
    # TODO where is the manual withdrawal!??
    # assert len(result["transactions"]) == 3
    for t in result["transactions"]:
        print(t)
        print()
