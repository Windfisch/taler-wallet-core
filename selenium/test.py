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
from urllib import parse
import time
import logging
import os

logger = logging.getLogger(__name__)
taler_baseurl = os.environ['TALER_BASEURL'] if 'TALER_BASEURL' in os.environ else 'https://test.taler.net/'

def client_setup():
    """Return a dict containing the driver and the extension's id"""
    co = webdriver.ChromeOptions()
    co.add_argument("load-extension=/home/marcello/wallet-webex")
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

# Note that the db appears to be reset automatically by the driver
def destroy_db(client, ext_id):
    url = 'chrome-extension://' + ext_id + '/popup/popup.html#/debug'
    client.get(url)
    button = client.find_element(By.XPATH, "//div[@id='content']/button[3]")
    button.click()
    time.sleep(4)
    alert = client.switch_to.alert
    alert.accept()


def is_error(client):
    """Return True in case of errors in the browser, False otherwise"""
    for log_type in ['browser']:
        for log in client.get_log(log_type):
            if log['level'] is 'error':
                print(log['level'] + ': ' + log['message'])
                return True
        return False


def make_donation(client):
    """Make donation at shop.test.taler.net. Assume the wallet has coins"""
    client.get(parse.urljoin(taler_baseurl, "shop"))
    form = client.find_element(By.TAG_NAME, "form")
    form.submit() # amount and receiver chosen
    confirm_taler = client.find_element(By.XPATH, "//form//input[@type='button']")
    confirm_taler.click() # Taler as payment option chosen
    wait = WebDriverWait(client, 10)
    confirm_pay = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[@class='accept']"))) 
    confirm_pay.click()


def buy_article(client):
    """Buy article at blog.test.taler.net. Assume the wallet has coins"""
    client.get(parse.urljoin(taler_baseurl, "blog"))
    teaser = client.find_element(By.XPATH, "//ul/h3/a[1]") # Pick 'Foreword' chapter
    teaser.click()
    wait = WebDriverWait(client, 10)
    confirm_pay = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[@class='accept']"))) 
    confirm_pay.click()


def register(client):
    """Register a new user to the bank delaying its execution until the
    profile page is shown"""
    client.get(parse.urljoin(taler_baseurl, "bank"))
    register_link = client.find_element(By.XPATH, "//a[@href='/accounts/register/']")
    register_link.click()
    client.find_element(By.TAG_NAME, "form")
    register = """\
        var form = document.getElementsByTagName('form')[0];
        form.username.value = '%s';
        form.password.value = 'test';
        form.submit();
        """ % str(int(time.time())) # need fresh username

    client.execute_script(register)
    # need implicit wait to be set up
    button = client.find_element(By.ID, "select-exchange")
    # when button is gotten, the browser is in the profile page
    # so the function can return
    if not is_error(client):
        logger.info('correctly registered at bank')
    else:
        logger.error('User not registered at bank')


def withdraw(client):
    """Register and withdraw (1) KUDOS for a fresh user"""
    register(client)
    # trigger withdrawal button
    button = client.find_element(By.ID, "select-exchange")
    button.click()
    location = client.execute_script("return document.location.href")
    client.get(location)
    # Confirm xchg
    wait = WebDriverWait(client, 10)
    button = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[1]")))
    # This click returns the captcha page (put wait?)
    button.click()
    answer = client.find_element(By.XPATH, "//input[@name='pin_0']")
    question = client.find_element(By.XPATH, "//span[@class='captcha-question']/div")
    questionTok = question.text.split()
    op1 = int(questionTok[2])
    op2 = int(questionTok[4])
    res = {'+': op1 + op2, '-': op1 - op2, u'\u00d7': op1 * op2}
    answer.send_keys(res[questionTok[3]])
    form = client.find_element(By.TAG_NAME, "form")
    form.submit()
    # check outcome
    msg_succ = client.find_element(By.CLASS_NAME, "informational-ok")
    if not msg_succ:
        logger.error('Error in withdrawing')
    else: logger.info('Withdrawal successful')


ret = client_setup()
client = ret['client']
client.implicitly_wait(10)
withdraw(client)
make_donation(client)
buy_article(client)
client.close()
