from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
import time
import logging

logger = logging.getLogger(__name__)
bank_url = 'http://127.0.0.1:9898'

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
    client.implicitly_wait(5)
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


def register(client):
    """Register a new user to the bank delaying its execution until the
    profile page is shown"""
    client.get(bank_url + '/accounts/register')
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
withdraw(client)
client.close()
