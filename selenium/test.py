#!/usr/bin/env python3

"""
Tests for the wallet. It looks for an env variable called TALER_BASEURL
where it appends "/banks" etc. in order to find bank and shops. If not
found, it defaults to https://test.taler.net/
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from selenium.common.exceptions import NoSuchElementException, TimeoutException
from urllib import parse
import argparse
import time
import logging
import sys
import os
import re

logger = logging.getLogger(__name__)
taler_baseurl = os.environ.get('TALER_BASEURL', 'https://test.taler.net/')

def client_setup(args):
    """Return a dict containing the driver and the extension's id"""
    co = webdriver.ChromeOptions()
    co.add_argument("load-extension=" + args.extdir)
    cap = webdriver.DesiredCapabilities.CHROME.copy()
    cap['loggingPrefs'] = {'driver': 'INFO', 'browser': 'INFO'}
    client = webdriver.Chrome(chrome_options=co, desired_capabilities=cap)
    client.get('https://taler.net')
    listener = """\
        document.addEventListener('taler-id', function(evt){
          var html = document.getElementsByTagName('html')[0];
          html.setAttribute('data-taler-wallet-id', evt.detail.id);
        }); 

        var evt = new CustomEvent('taler-query-id');
        document.dispatchEvent(evt);
        """
    client.execute_script(listener)
    html = client.find_element(By.TAG_NAME, "html")
    return {'client': client, 'ext_id': html.get_attribute('data-taler-wallet-id')}

def is_error(client):
    """Return True in case of errors in the browser, False otherwise"""
    for log_type in ['browser']:
        for log in client.get_log(log_type):
            if log['level'] is 'error':
                print(log['level'] + ': ' + log['message'])
                return True
        return False


def switch_base():
    """If 'test' is in TALER_BASEURL, then make it be 'demo', and viceversa.
    Used to trig currency mismatch errors. It assumes that the https://{test,demo}.taler.net
    layout is being used"""
    global taler_baseurl
    url = parse.urlparse(taler_baseurl)
    if url[1] == 'test.taler.net':
        taler_baseurl = "https://demo.taler.net"
    if url[1] == 'demo.taler.net':
        taler_baseurl = "https://test.taler.net"

def make_donation(client, amount_value=None):
    """Make donation at shop.test.taler.net. Assume the wallet has coins"""
    client.get(parse.urljoin(taler_baseurl, "shop"))
    try:
        form = client.find_element(By.TAG_NAME, "form")
    except NoSuchElementException:
        logger.error('No donation form found')
        sys.exit(1)
    if amount_value:
        xpath = "//select[@id='taler-donation']/option[@value='" + str(amount_value) + "']"
        try:
            desired_amount = client.find_element(By.XPATH, xpath)
            desired_amount.click()
        except NoSuchElementException:
            logger.error("value '" + str(amount_value) + "' is not offered by this shop to donate, please adapt it")
            sys.exit(1)
    form.submit() # amount and receiver chosen
    try:
        confirm_taler = client.find_element(By.XPATH, "//form//input[@type='button']")
    except NoSuchElementException:
        logger.error('Could not trigger contract on donation shop')
        sys.exit(1)
    confirm_taler.click() # Taler as payment option chosen
    # explicit get() is needed, it hangs (sometimes) otherwise
    time.sleep(1)
    client.get(client.current_url)
    wait = WebDriverWait(client, 10)
    try:
        confirm_pay = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[@class='accept']"))) 
    except TimeoutException:
        logger.error('Could not confirm payment on donation shop')
        sys.exit(1)
    confirm_pay.click()


def buy_article(client):
    """Buy article at blog.test.taler.net. Assume the wallet has coins"""
    client.get(parse.urljoin(taler_baseurl, "blog"))
    try:
        teaser = client.find_element(By.XPATH, "//ul/h3/a[1]") # Pick 'Foreword' chapter
    except NoSuchElementException:
        logger.error('Could not choose "Foreword" chapter on blog')
        sys.exit(1)
    teaser.click()
    # explicit get() is needed, it hangs (sometimes) otherwise
    time.sleep(1)
    client.get(client.current_url)
    wait = WebDriverWait(client, 10)
    try:
        confirm_pay = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[@class='accept']"))) 
    except TimeoutException:
        logger.error('Could not confirm payment on blog')
        sys.exit(1)
    confirm_pay.click()


def register(client):
    """Register a new user to the bank delaying its execution until the
    profile page is shown"""
    client.get(parse.urljoin(taler_baseurl, "bank"))
    try:
        register_link = client.find_element(By.XPATH, "//a[@href='/accounts/register/']")
    except NoSuchElementException:
        logger.error("Could not find register link on bank's homepage")
        sys.exit(1)
    register_link.click()
    try:
        client.find_element(By.TAG_NAME, "form")
    except NoSuchElementException:
        logger.error("Register form not found")
        sys.exit(1)

    register = """\
        var form = document.getElementsByTagName('form')[0];
        form.username.value = '%s';
        form.password.value = 'test';
        form.submit();
        """ % str(int(time.time())) # need fresh username

    client.execute_script(register)
    # need implicit wait to be set up
    try:
        button = client.find_element(By.ID, "select-exchange")
    except NoSuchElementException:
        logger.error("Selecting exchange impossible")
        sys.exit(1)
    # when button is gotten, the browser is in the profile page
    # so the function can return
    if not is_error(client):
        logger.info('correctly registered at bank')
    else:
        logger.error('User not registered at bank')


def withdraw(client, amount_value=None):
    """Register and withdraw (1) KUDOS for a fresh user"""
    register(client)
    # trigger withdrawal button
    try:
        button = client.find_element(By.ID, "select-exchange")
    except NoSuchElementException:
        logger.error("Selecting exchange impossible")
        sys.exit(1)
    if amount_value:
        xpath = "//select/option[@value='" + str(amount_value) + "']"
        try:
            desired_amount = client.find_element(By.XPATH, xpath)
            desired_amount.click()
        except NoSuchElementException:
            logger.error("value '" + str(amount_value) + "' is not offered by this bank to withdraw, please adapt it")
            sys.exit(1)
    button.click()
    location = client.execute_script("return document.location.href")
    client.get(location)
    # Confirm xchg
    wait = WebDriverWait(client, 10)
    try:
        button = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[1]")))
    except TimeoutException:
        logger.error("Could not confirm exchange (therefore provide withdrawal needed data)")
        sys.exit(1)
    # This click returns the captcha page (put wait?)
    button.click()
    try:
        answer = client.find_element(By.XPATH, "//input[@name='pin_0']")
        question = client.find_element(By.XPATH, "//span[@class='captcha-question']/div")
    except NoSuchElementException:
        logger.error("Captcha page not gotten or malformed")
        sys.exit(1)
    questionTok = question.text.split()
    op1 = int(questionTok[2])
    op2 = int(questionTok[4])
    res = {'+': op1 + op2, '-': op1 - op2, u'\u00d7': op1 * op2}
    answer.send_keys(res[questionTok[3]])
    try:
        form = client.find_element(By.TAG_NAME, "form")
    except NoSuchElementException:
        logger.error("Could not submit captcha answer (therefore trigger withdrawal)")
        sys.exit(1)
    form.submit()
    # check outcome
    try:
        client.find_element(By.CLASS_NAME, "informational-ok")
    except NoSuchElementException:
        logger.error("Withdrawal not completed")
        sys.exit(1)
    logger.info("Withdrawal completed")


parser = argparse.ArgumentParser()
parser.add_argument('--extdir', help="Folder containing the unpacked extension", metavar="EXTDIR", type=str, dest="extdir", required=True)
args = parser.parse_args()
ret = client_setup(args)
client = ret['client']
client.implicitly_wait(10)
withdraw(client, 10)
switch_base() # inducing error
make_donation(client, 6.0)
buy_article(client)
logger.info("Test passed")
client.close()
sys.exit(0)
