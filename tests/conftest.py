import pytest

from tests.components.bank import Bank
from tests.components.config import Config
from tests.components.exchange import Exchange
from tests.components.merchant import Merchant
from tests.components.wallet import Wallet


@pytest.fixture
def config(watcher_getter, request, tmpdir, worker_id):
    return Config(request, tmpdir, worker_id)


@pytest.fixture
def exchange(watcher_getter, request, config):
    exchange = Exchange(config, watcher_getter, request)
    exchange.start()
    return exchange


@pytest.fixture
def bank(watcher_getter, request, config):
    bank = Bank(config, watcher_getter, request)
    bank.start()
    return bank


@pytest.fixture
def merchant(watcher_getter, request, config):
    merchant = Merchant(config, watcher_getter, request)
    merchant.start()
    return merchant


@pytest.fixture
def wallet(watcher_getter, config):
    return Wallet(config)
