#!/usr/bin/env python3

"""
Tests for the wallet. It looks for an env variable called TALER_BASEURL
where it appends "/banks" etc. in order to find bank and shops. If not
found, it defaults to https://test.taler.net/
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.common.exceptions import NoSuchElementException, TimeoutException
from selenium.webdriver.common.action_chains import ActionChains
from pyvirtualdisplay import Display
from urllib import parse
import argparse
import time
import logging
import sys
import os
import re
import json

logging.basicConfig(format='%(levelname)s: %(message)s', level=logging.INFO)
logger = logging.getLogger(__name__)
taler_baseurl = os.environ.get('TALER_BASEURL', 'https://test.taler.net/')
display = Display(visible=0, size=(1024, 768))
display.start()

def client_setup(args):
    """Return a dict containing the driver and the extension's id"""
    co = webdriver.ChromeOptions()
    if args.ext:
        co.add_extension(args.ext)
    elif args.extdir:
        co.add_argument("load-extension=%s" % args.extdir)
    else:
        logger.error("Provide one between '--ext' and '--ext-unpacked'")
        sys.exit(1)

    cap = co.to_capabilities()
    cap['loggingPrefs'] = {'driver': 'INFO', 'browser': 'INFO'}

    if args.remote:
        client = webdriver.Remote(desired_capabilities=cap, command_executor=args.remote)
    else:
        client = webdriver.Chrome(desired_capabilities=cap)
    client.get('https://taler.net')

    listener = """\
        document.addEventListener('taler-query-id-result', function(evt){
          var html = document.getElementsByTagName('html')[0];
          html.setAttribute('data-taler-wallet-id', evt.detail.id);
        }); 

        var evt = new CustomEvent('taler-query-id');
        document.dispatchEvent(evt);
        """
    client.execute_script(listener)
    html = client.find_element(By.TAG_NAME, "html")
    ext_id = html.get_attribute('data-taler-wallet-id')
    logger.info("Extension ID: %s" % str(ext_id))
    return {'client': client, 'ext_id': ext_id}

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

def make_donation(client, amount_menuentry=None):
    """Make donation at shop.test.taler.net. Assume the wallet has coins"""
    client.get(parse.urljoin(taler_baseurl, "donations"))
    try:
        form = client.find_element(By.TAG_NAME, "form")
    except NoSuchElementException:
        logger.error('No donation form found')
        sys.exit(1)
    if amount_menuentry:
        xpath_menu = '//select[@id="taler-donation"]'
        try:
            dropdown = client.find_element(By.XPATH, xpath_menu)
            for option in dropdown.find_elements_by_tag_name("option"):
                # Tried option.text, did not work.
                if option.get_attribute("innerHTML") == amount_menuentry:
                    option = WebDriverWait(client, 10).until(EC.visibility_of(option))
                    logger.info("Picked donation %s" % option.text)
                    option.click()
                    break
        except NoSuchElementException:
            logger.error("value '" + str(amount_value) + "' is not offered by this shop to donate, please adapt it")
            sys.exit(1)
    form.submit() # amount and receiver chosen
    wait = WebDriverWait(client, 10)
    try:
        confirm_taler = wait.until(EC.element_to_be_clickable((By.ID, "select-payment-method")))
        logger.info("confirm_taler: %s" % confirm_taler.get_attribute("outerHTML"))
    except NoSuchElementException:
        logger.error('Could not trigger contract on donation shop')
        sys.exit(1)
    confirm_taler.click() # Taler as payment option chosen
    try:
        confirm_pay = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[@class='accept']"))) 
    except TimeoutException:
        logger.error('Could not confirm payment on donation shop')
        sys.exit(1)
    confirm_pay.click()


def buy_article(client):
    """Buy article at blog.test.taler.net. Assume the wallet has coins"""
    client.get(parse.urljoin(taler_baseurl, "shop"))
    wait = WebDriverWait(client, 10)
    try:
        further_teaser = wait.until(EC.element_to_be_clickable((By.XPATH, '//h3[a[starts-with(@href, "/essay")]][7]'))) 
        teaser = wait.until(EC.element_to_be_clickable((By.XPATH, '//h3/a[@href="/essay/Foreword"]')))
        # NOTE: we need to scroll the browser a few inches deeper respect
        # to the element which is to be clicked, otherwise we hit the lang
        # bar at the bottom..
        # Unfortunately, just retrieving the element to click and click it
        # did NOT work.
        actions = ActionChains(client)
        time.sleep(2)
        logger.info("Batching:..")
        logger.info("..scroll page down")
        actions.move_to_element(further_teaser)
        time.sleep(2)
        logger.info("..focus on article")
        actions.move_to_element(teaser)
        time.sleep(2)
        logger.info("..click on article")
        actions.click(teaser)
        time.sleep(2)
        logger.info("Performing batched actions")
        actions.perform()
    except (NoSuchElementException, TimeoutException):
        logger.error('Could not choose "Foreword" chapter on blog')
        sys.exit(1)
    # explicit get() is needed, it hangs (sometimes) otherwise
    time.sleep(1)
    try:
        confirm_pay = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[@class='accept']"))) 
        logger.info("Pay button turned clickable")
    except TimeoutException:
        logger.error('Could not confirm payment on blog')
        sys.exit(1)
    confirm_pay.click()
    # check here for good elements
    try:
        client.find_element(By.XPATH, "//h1[contains(., 'Foreword')]")
    except NoSuchElementException:
        logger.error("Article not correctly bought")
        sys.exit(1)


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
        logger.info('Correctly registered at bank')
    else:
        logger.error('User not registered at bank')


def withdraw(client, amount_menuentry=None):
    """Register and withdraw (1) KUDOS for a fresh user"""
    register(client)
    logger.info("Withdrawing..")
    wait = WebDriverWait(client, 10)
    # trigger withdrawal button
    try:
        button = client.find_element(By.ID, "select-exchange")
    except NoSuchElementException:
        logger.error("Selecting exchange impossible")
        sys.exit(1)
    if amount_menuentry:
        xpath_menu = '//select[@id="reserve-amount"]'
        try:
            dropdown = client.find_element(By.XPATH, xpath_menu)
            for option in dropdown.find_elements_by_tag_name("option"):
                if option.get_attribute("innerHTML") == amount_menuentry:
                    option = WebDriverWait(client, 10).until(EC.visibility_of(option))
                    option.click()
                    break
        except NoSuchElementException:
            logger.error("value '" + str(amount_value) + "' is not offered by this bank to withdraw, please adapt it")
            sys.exit(1)
    # confirm amount
    logger.info("About to confirm amount")
    button.click()
    logger.info("Exchange confirmation refreshed")
    # Confirm exchange (in-wallet page)
    try:
        logger.info("Polling for the button")
        mybutton = client.find_element(By.XPATH, "//button[1]")
        logger.info("Found button '%s'" % mybutton.text)
        button = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[1]")))
    except TimeoutException:
        logger.error("Could not confirm exchange")
        sys.exit(1)
    # This click returns the captcha page (put wait?)
    logger.info("About to confirm exchange")
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
parser.add_argument('--ext', help="packed extension (.crx file)", metavar="CRX", type=str, dest="ext")
parser.add_argument('--ext-unpacked', help="loads unpacked extension from directory", metavar="EXTDIR", type=str, dest="extdir")
parser.add_argument('--remote', help="Whether the test is to be run against URI, or locally", metavar="URI", type=str, dest="remote")
args = parser.parse_args()
logger.info("testing against " + taler_baseurl)
logger.info("Getting extension's ID..")
ret = client_setup(args)
logger.info("Creating the browser driver..")
client = ret['client']
client.implicitly_wait(10)
withdraw(client, "10.00 PUDOS")
logger.info("Making donations..")
# FIXME: wait for coins more appropriately
time.sleep(2)
make_donation(client, "1.0 PUDOS")
logger.info("Buying article..")
buy_article(client)
logger.info("Test passed")
client.close()
sys.exit(0)
