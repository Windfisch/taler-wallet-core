#!/usr/bin/python3

import unittest
from selenium import webdriver
from selenium.webdriver.common.keys import Keys

class PythonOrgSearch(unittest.TestCase):

    def setUp(self):
        self.driver = webdriver.Chrome()

    def test_taler_reachable(self):
        driver = self.driver
        driver.get("https://bank.demo.taler.net")


    def tearDown(self):
        self.driver.close()

if __name__ == "__main__":
    unittest.main()
