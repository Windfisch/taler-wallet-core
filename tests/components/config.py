import logging
import os
from shutil import copyfile
from subprocess import run


class Config:

    def __init__(self, request, tmpdir, worker_id):
        self.tmpdir = tmpdir.strpath
        self.data_home = os.path.join(self.tmpdir, 'data')

        # workaround for https://github.com/pytest-dev/pytest-services/issues/37
        logger = logging.getLogger(
            '[{worker_id}] {name}'.format(name="pytest_services.log", worker_id=worker_id))
        logger.handlers.clear()

        # copy config file from template
        self.conf = tmpdir.join("test.conf").strpath
        template = os.path.join(os.path.dirname(__file__), 'template.ini')
        copyfile(template, self.conf)

        # set TALER_HOME base dir
        config_cmd = ["taler-config", "-c", self.conf]
        run(config_cmd + ["-s", "PATHS", "-o", "TALER_HOME", "-V", self.tmpdir], check=True)

        # get path of exchange private key file and create key pair
        config_cmd = ["taler-config", "-c", self.conf]
        r = run(config_cmd + ["-f", "-s", "EXCHANGE", "-o", "MASTER_PRIV_FILE"],
                capture_output=True, check=True, text=True)
        master_priv_file = r.stdout.rstrip()
        master_priv_dir = os.path.dirname(master_priv_file)
        os.makedirs(master_priv_dir)
        run(["gnunet-ecc", "-g1", master_priv_file], check=True, capture_output=True)
        r = run(["gnunet-ecc", "-p", master_priv_file], check=True, capture_output=True, text=True)
        self.master_pub = r.stdout.rstrip()

        # write exchange public key into config
        run(config_cmd + ["-s", "exchange",
                          "-o", "MASTER_PUBLIC_KEY",
                          "-V", self.master_pub], check=True)
        run(config_cmd + ["-s", "merchant-exchange-default",
                          "-o", "MASTER_KEY",
                          "-V", self.master_pub], check=True)

        # write DB name into config
        self.db = "test-db"
        db_uri = "postgres:///" + self.db
        run(config_cmd + ["-s", "exchangedb-postgres", "-o", "CONFIG", "-V", db_uri], check=True)
        run(config_cmd + ["-s", "auditordb-postgres", "-o", "CONFIG", "-V", db_uri], check=True)
        run(config_cmd + ["-s", "merchantdb-postgres", "-o", "CONFIG", "-V", db_uri], check=True)
        run(config_cmd + ["-s", "bank", "-o", "database", "-V", db_uri], check=True)

        # create new DB
        run(["dropdb", self.db], capture_output=True)
        run(["createdb", self.db], check=True)

        # drop DB when test ends
        def finalize():
            run(["dropdb", self.db], capture_output=True)

        request.addfinalizer(finalize)
