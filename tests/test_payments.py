#!/usr/bin/env python3
from tests import print_json


def test_payments(exchange, bank, merchant, wallet):
    merchant.create_instance()
    pay_uri = merchant.gen_pay_uri("TESTKUDOS:2")

    # TODO fix
    result = wallet.cmd("preparePay", {"talerPayUri": pay_uri})
    print_json(result)
