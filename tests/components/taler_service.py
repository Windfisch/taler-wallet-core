import requests
from requests.exceptions import ConnectionError


class TalerService:

    def __init__(self, config, watcher_getter, request):
        self.config = config
        self.watcher_getter = watcher_getter
        self.request = request

    def test_url(self):
        try:
            requests.get(self.url, timeout=3)
        except ConnectionError as e:
            return False
        else:
            return True
