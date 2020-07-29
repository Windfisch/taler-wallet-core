import os
from subprocess import run

import psutil

import requests

import secrets

from .taler_service import TalerService

from dataclasses import dataclass

@dataclass
class BankUser:
    username: str
    password: str

@dataclass
class WithdrawUriResponse:
    taler_withdraw_uri: str
    withdrawal_id: str


class Bank(TalerService):

    def __init__(self, config, watcher_getter, request):
        super().__init__(config, watcher_getter, request)

        # get localhost port and store bank URL
        r = run(["taler-config", "-c", config.conf, "-s", "BANK", "-o", "HTTP_PORT"],
                check=True, text=True, capture_output=True)
        self.url = "http://localhost:%s/" % r.stdout.rstrip()

    def start(self):
        db = "postgres:///%s" % self.config.db
        log_path = os.path.join(self.config.tmpdir, "bank.log")
        log_file = open(log_path, 'w')
        self.watcher_getter(
            name='taler-bank-manage-testing',
            arguments=[self.config.conf, db, 'serve-http'],
            checker=self.test_process,
            kwargs=dict(stderr=log_file, stdout=log_file),
            request=self.request,  # Needed for the correct execution order of finalizers
        )

        def close_log():
            log_file.close()

        self.request.addfinalizer(close_log)

    def register_random_user(self):
        username = f"testuser-{secrets.token_hex(10)}"
        password = f"testpw-{secrets.token_hex(10)}"
        requests.post(
            f"{self.url}testing/register",
            json=dict(username=username, password=password)
        )
        return BankUser(username, password)

    def generate_withdraw_uri(self, bankuser, amount):
        auth = (bankuser.username, bankuser.password)
        resp = requests.post(
            f"{self.url}accounts/{bankuser.username}/withdrawals",
            json=dict(amount=amount),
            auth=auth
        )
        rj = resp.json()
        return WithdrawUriResponse(
            taler_withdraw_uri=rj["taler_withdraw_uri"],
            withdrawal_id=rj["withdrawal_id"],
        )

    def confirm_withdrawal(self, bankuser, withdrawal_id):
        auth = (bankuser.username, bankuser.password)
        resp = requests.post(
            f"{self.url}accounts/{bankuser.username}/withdrawals/{withdrawal_id}/confirm",
            auth=auth
        )

    # Alternative way to check if the bank came up.
    # Testing the URL has the issue that on the CI, django keeps closing the connection.
    @staticmethod
    def test_process():
        for p in psutil.process_iter(['name', 'cmdline']):
            if p.info["name"] == "uwsgi" and p.info["cmdline"][-1] == "talerbank.wsgi":
                return True
        return False
