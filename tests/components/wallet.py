import json
import os
from subprocess import run


class Wallet:

    def __init__(self, config):
        self.db = os.path.join(config.tmpdir, "wallet-db.json")
        self.arg_db = "--wallet-db=%s" % self.db
        self.log_path = os.path.join(config.tmpdir, "wallet.log")

    def cmd(self, command, request=None):
        if request is None:
            request = dict()
        request = json.dumps(request)
        r = run(["taler-wallet-cli", self.arg_db, "api", command, request],
                timeout=10, text=True, capture_output=True)
        self.write_to_log(r.stderr)
        if r.returncode != 0:
            print(r)
        assert r.returncode == 0
        json_r = json.loads(r.stdout)
        if json_r["type"] != "response" or "result" not in json_r:
            print(json_r)
        assert json_r["type"] == "response"
        return json_r["result"]

    def testing_withdraw(self, amount, exchange_url, bank_url):
        r = run(["taler-wallet-cli", self.arg_db, "--no-throttle", "testing", "withdraw",
                 "-a", amount,
                 "-e", exchange_url,
                 "-b", bank_url
                 ], timeout=10, check=True, text=True, capture_output=True)
        self.write_to_log(r.stderr)

    def run_pending(self):
        r = run(["taler-wallet-cli", self.arg_db, "run-pending"],
                timeout=10, check=True, text=True, capture_output=True)
        self.write_to_log(r.stderr)
        return r.stdout.rstrip()

    def run_until_done(self):
        r = run(["taler-wallet-cli", self.arg_db, "run-until-done"],
                timeout=10, check=True, text=True, capture_output=True)
        self.write_to_log(r.stderr)
        return r.stdout.rstrip()

    def write_to_log(self, data):
        with open(self.log_path, "a") as f:
            f.write(data)
