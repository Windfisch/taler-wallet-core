from taler.util.amount import Amount


def check_single_balance(balances, available, pending_in="TESTKUDOS:0", pending_out="TESTKUDOS:0",
                         has_pending=False):
    assert len(balances) == 1
    assert balances[0]["available"] == available
    assert balances[0]["pendingIncoming"] == pending_in
    assert balances[0]["pendingOutgoing"] == pending_out
    assert balances[0]["hasPendingTransactions"] == has_pending


def json_to_amount(d):
    return Amount(d["currency"], d["value"], d["fraction"])
