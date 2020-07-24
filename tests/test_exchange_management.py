#!/usr/bin/env python3


def test_exchanges(exchange, wallet):
    # list of exchanges is initially empty
    result = wallet.cmd("listExchanges")
    assert not result["exchanges"]

    # adding an exchange works
    result = wallet.cmd("addExchange", {"exchangeBaseUrl": exchange.url})
    assert not result  # result is empty

    # list includes added exchange
    result = wallet.cmd("listExchanges")
    e = result["exchanges"][0]
    assert e["exchangeBaseUrl"] == exchange.url
    assert e["currency"] == "TESTKUDOS"
    assert len(e["paytoUris"]) >= 1
