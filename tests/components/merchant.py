import os
from subprocess import run

import requests

from .taler_service import TalerService


class Merchant(TalerService):

    def __init__(self, config, watcher_getter, request):
        super().__init__(config, watcher_getter, request)

        # get localhost port and store merchant URL
        r = run(["taler-config", "-c", config.conf, "-s", "MERCHANT", "-o", "PORT"],
                check=True, text=True, capture_output=True)
        self.url = "http://localhost:%s/" % r.stdout.rstrip()

    def start(self):
        log_path = os.path.join(self.config.tmpdir, "merchant.log")
        self.watcher_getter(
            name='taler-merchant-httpd',
            arguments=['-c', self.config.conf, '-L', 'INFO', '-l', log_path],
            checker=self.test_url,
            request=self.request,  # Needed for the correct execution order of finalizers
        )

    def create_instance(self, instance="default", name="GNU Taler Merchant"):
        body = {
            "id": instance,
            "name": name,
            "payto_uris": ["payto://x-taler-bank/test_merchant"],
            "address": {},
            "jurisdiction": {},
            "default_max_wire_fee": "TESTKUDOS:1",
            "default_wire_fee_amortization": 3,
            "default_max_deposit_fee": "TESTKUDOS:1",
            "default_wire_transfer_delay": {"d_ms": "forever"},
            "default_pay_delay": {"d_ms": "forever"}
        }
        r = requests.post(self.url + "private/instances", json=body)
        r.raise_for_status()

    def create_order(self, amount, instance="default", summary="Test Order",
                     fulfillment_url="taler://fulfillment-success/Enjoy+your+ice+cream!"):
        body = {
            "order": {
                "amount": amount,
                "summary": summary,
                "fulfillment_url": fulfillment_url
            }
        }
        r = requests.post("{}instances/{}/private/orders".format(self.url, instance), json=body)
        r.raise_for_status()
        return r.json()

    def check_payment(self, order_id, instance="default"):
        r = requests.get("{}instances/{}/private/orders/{}".format(self.url, instance, order_id))
        r.raise_for_status()
        return r.json()

    def gen_pay_uri(self, amount, instance="default", summary="Test Order",
                    fulfillment_url="taler://fulfillment-success/Enjoy+your+ice+cream!"):
        order = self.create_order(amount, instance, summary, fulfillment_url)
        response = self.check_payment(order["order_id"], instance)
        return response["taler_pay_uri"]
