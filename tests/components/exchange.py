import os
from subprocess import run

from .taler_service import TalerService


class Exchange(TalerService):

    def __init__(self, config, watcher_getter, request):
        super().__init__(config, watcher_getter, request)

        # get own URL from config
        r = run(["taler-config", "-c", config.conf, "-s", "EXCHANGE", "-o", "BASE_URL"],
                check=True, text=True, capture_output=True)
        self.url = r.stdout.rstrip()

        # get and create directory for terms of service
        r = run(["taler-config", "-c", config.conf, "-s", "EXCHANGE", "-o", "TERMS_DIR"],
                check=True, text=True, capture_output=True)
        self.terms_dir = r.stdout.rstrip().replace("${TALER_DATA_HOME}", config.data_home)
        terms_dir_en = os.path.join(self.terms_dir, 'en')
        os.makedirs(terms_dir_en)

        # get eTag and create ToS file for it
        r = run(["taler-config", "-c", config.conf, "-s", "EXCHANGE", "-o", "TERMS_ETAG"],
                check=True, text=True, capture_output=True)
        self.terms_etag = r.stdout.rstrip()
        self.tos = "ToS Foo Bar\n"
        with open(os.path.join(terms_dir_en, "%s.txt" % self.terms_etag), 'w') as f:
            f.write(self.tos)

    def start(self):
        run(["taler-exchange-dbinit", "-c", self.config.conf], check=True)
        run(["taler-exchange-wire", "-c", self.config.conf], check=True)
        run(["taler-exchange-keyup", "-c", self.config.conf,
             "-L", "INFO",
             "-o", os.path.join(self.config.tmpdir, "e2a.dat")
             ], check=True, capture_output=True)
        log_path = os.path.join(self.config.tmpdir, "exchange.log")
        self.watcher_getter(
            name='taler-exchange-httpd',
            arguments=['-c', self.config.conf, '-l', log_path],
            checker=self.test_url,
            request=self.request,  # Needed for the correct execution order of finalizers
        )
        # the wirewatch is needed for interaction with the bank
        log_wirewatch_path = os.path.join(self.config.tmpdir, "exchange-wirewatch.log")
        self.watcher_getter(
            name='taler-exchange-wirewatch',
            arguments=['-c', self.config.conf, '-l', log_wirewatch_path],
            checker=lambda: True,  # no need to wait for this to come up
            request=self.request,  # Needed for the correct execution order of finalizers
        )
