import json

from taler.util.amount import Amount


def check_single_balance(
        balances,
        available,
        pending_in=Amount.parse("TESTKUDOS:0"),
        pending_out=Amount.parse("TESTKUDOS:0"),
):
    assert len(balances) == 1
    assert Amount.parse(balances[0]["available"]) == available
    assert Amount.parse(balances[0]["pendingIncoming"]) == pending_in
    assert Amount.parse(balances[0]["pendingOutgoing"]) == pending_out


def json_to_amount(d):
    return Amount(d["currency"], d["value"], d["fraction"])


def print_json(obj):
    print(json.dumps(obj, indent=2))
