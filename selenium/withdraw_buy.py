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

def kill_display():
    if hasattr(display, "old_display_var"):
        display.stop()

# All the operations we need upon errors.
def abort(client):
    print_log(client)
    client.quit()
    kill_display()
    sys.exit(1)


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

    if not args.withhead:
        display.start()
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

def print_log(client):
    print("--- Dumping browser log: ---")
    for log in client.get_log("browser"):
        print(log['level'] + ': ' + log['message'])
    print("--- End of browser log ---")


def switch_base():
    """If 'test' is in TALER_BASEURL, then make it be 'demo',
    and viceversa.  Used to trigger currency mismatch errors.
    It assumes that the https://{test,demo}.taler.net layout
    for URLs is used"""
    global taler_baseurl
    url = parse.urlparse(taler_baseurl)
    if url[1] == 'test.taler.net':
        taler_baseurl = "https://demo.taler.net"
    if url[1] == 'demo.taler.net':
        taler_baseurl = "https://test.taler.net"

def make_donation(client, amount_menuentry):
    """Make donation at donations.test.taler.net. Assume
    the wallet has coins.  Just donate to the default receiver"""
    client.get(parse.urljoin(taler_baseurl, "donations"))
    try:
        form = client.find_element(By.TAG_NAME, "form")
    except NoSuchElementException:
        logger.error('No donation form found')
        return False
    xpath_menu = '//select[@id="taler-donation"]'
    try:
        dropdown = client.find_element(By.XPATH, xpath_menu)
        for option in dropdown.find_elements_by_tag_name("option"):
            if option.get_attribute("innerHTML") == amount_menuentry:
                option = WebDriverWait(client, 10).until(EC.visibility_of(option))
                option.click()
                break
    except NoSuchElementException:
        logger.error("amount '" + str(amount_value) + "\
            ' is not offered by this shop to donate")
        return False
    form.submit()
    wait = WebDriverWait(client, 10)
    try:
        confirm_taler = wait.until(EC.element_to_be_clickable((By.ID, "select-payment-method")))
    except NoSuchElementException:
        logger.error('Could not trigger contract on donation shop')
        return False
    confirm_taler.click()
    try:
        confirm_pay = wait.until(EC.element_to_be_clickable((By.XPATH,
            "//button[@class='pure-button button-success']"))) 
    except TimeoutException:
        logger.error('Could not confirm payment on donation shop')
        return False
    confirm_pay.click()
    return True

# Check if the current page is displaying the article
# whose title is 'title'.

def check_article(client, title):
    try:
        client.find_element(By.XPATH,
            "//h1[contains(., '%s')]" % title.replace("_", " "))
    except NoSuchElementException:
        logger.error("Article '%s' not shown on this (%s) page" % (title, client.current_url))
        return False
    return True


def buy_article(client, title, fulfillment_url=None):
    """Buy article at shop.test.taler.net. Assume the wallet
    has coins.  Return False if some error occurs, the fulfillment
    URL otherwise"""

    if fulfillment_url:
        client.get(fulfillment_url)
        if check_article(client, title):
            return fulfillment_url
        return False

    client.get(parse.urljoin(taler_baseurl, "shop"))
    wait = WebDriverWait(client, 20)

    try:
        teaser = wait.until(EC.element_to_be_clickable((By.XPATH,
            "//h3/a[@href=\"/essay/%s\"]" % title)))
        client.execute_script("window.scrollBy(30, %s)" % teaser.location['y'])
        teaser.click()
    except (NoSuchElementException, TimeoutException) as e:
        logger.error("Could not choose chapter '%s'" % title)
        return False
    time.sleep(1)
    try:
        confirm_pay = wait.until(EC.element_to_be_clickable((By.XPATH,
            "//button[@class='pure-button button-success']"))) 
    except TimeoutException:
        logger.error('Could not confirm contract on blog (timed out)')
        return False
    confirm_pay.click()
    time.sleep(3)
    if not check_article(client, title):
        return False
    return client.current_url

def register(client):
    """Register a new user to the bank delaying its execution
    until the profile page is shown"""
    client.get(parse.urljoin(taler_baseurl, "bank"))
    try:
        register_link = client.find_element(By.XPATH,
            "//a[@href='/accounts/register/']")
    except NoSuchElementException:
        logger.error("Could not find register link on bank's homepage")
        return False
    register_link.click()
    try:
        client.find_element(By.TAG_NAME, "form")
    except NoSuchElementException:
        logger.error("Register form not found")
        return False

    register = """\
        var form = document.getElementsByTagName('form')[0];
        form.username.value = '%s';
        form.password.value = 'test';
        form.submit();
        """ % str(int(time.time()))

    client.execute_script(register)
    try:
        button = client.find_element(By.ID, "select-exchange")
    except NoSuchElementException:
        logger.error("Selecting exchange impossible")
        return False
    return True


def withdraw(client, amount_menuentry):
    """Register and withdraw (1) KUDOS for a fresh user"""
    wait = WebDriverWait(client, 10)
    # trigger withdrawal button
    try:
        button = client.find_element(By.ID, "select-exchange")
    except NoSuchElementException:
        logger.error("Selecting exchange impossible")
        return False
    xpath_menu = '//select[@id="reserve-amount"]'
    try:
        dropdown = client.find_element(By.XPATH, xpath_menu)
        for option in dropdown.find_elements_by_tag_name("option"):
            if option.get_attribute("innerHTML") == amount_menuentry:
                option = WebDriverWait(client, 10).until(EC.visibility_of(option))
                option.click()
                break
    except NoSuchElementException:
        logger.error("amount '" + str(amount_value) + "' \
            is not offered by this bank to withdraw")
        return False
    # confirm amount
    button.click()
    # Confirm exchange (in-wallet page)
    try:
        accept_exchange = wait.until(EC.element_to_be_clickable((By.XPATH,
            "//button[@class='pure-button button-success']")))
    except TimeoutException:
        logger.error("Could not confirm exchange")
        return False
    accept_exchange.click()
    try:
        answer = client.find_element(By.XPATH, "//input[@name='pin_0']")
        question = client.find_element(By.XPATH, "//span[@class='captcha-question']/div")
    except NoSuchElementException:
        logger.error("Captcha page unavailable or malformed")
        return False
    questionTok = question.text.split()
    op1 = int(questionTok[2])
    op2 = int(questionTok[4])
    res = {'+': op1 + op2, '-': op1 - op2, u'\u00d7': op1 * op2}
    answer.send_keys(res[questionTok[3]])
    try:
        form = client.find_element(By.TAG_NAME, "form")
    except NoSuchElementException:
        logger.error("Could not submit captcha answer")
        return False
    form.submit()
    # check outcome
    try:
        client.find_element(By.CLASS_NAME, "informational-ok")
    except NoSuchElementException:
        logger.error("Withdrawal not completed")
        return False
    return True


parser = argparse.ArgumentParser()
parser.add_argument('--ext', help="packed extension (.crx file)",
    metavar="CRX", type=str, dest="ext")
parser.add_argument('--ext-unpacked',
    help="loads unpacked extension from directory",
    metavar="EXTDIR", type=str, dest="extdir")
parser.add_argument('--remote',
    help="Whether the test is to be run against URI, or locally",
    metavar="URI", type=str, dest="remote")
parser.add_argument('--with-head',
    help="Graphically shows the browser (useful to debug)",
    action="store_true", dest="withhead")
args = parser.parse_args()

client = client_setup(args)['client']
client.implicitly_wait(10)

if not register(client):
    abort(client)

if not withdraw(client, "10.00 TESTKUDOS"):
    abort(client)

fulfillment_url_25 = buy_article(client, "25._The_Danger_of_Software_Patents")

if not fulfillment_url_25:
    abort(client)

client.delete_all_cookies()

if not buy_article(client, "25._The_Danger_of_Software_Patents", fulfillment_url_25):
    logger.error("Could not replay payment")
    abort(client)

if not make_donation(client, "1.0 TESTKUDOS"):
    abort(client)

client.quit()
kill_display()
sys.exit(0)
