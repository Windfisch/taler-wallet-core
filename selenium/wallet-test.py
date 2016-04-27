from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
import time
import logging
import unittest
import json


logger = logging.getLogger(__name__)

def client_setup():
    """Return a Chrome browser the extension's id"""
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
    """In case of errors in the browser, print them and return True"""
    for log_type in ['browser']:
        for log in client.get_log(log_type):
            if log['level'] is 'error':
                print(log['level'] + ': ' + log['message'])
                return True
        return False


# class PopupTestCase(unittest.TestCase):
#     """Test wallet's popups"""
#     def setUp(self):
#         ret = client_setup()
#         self.client = ret['client']
#         self.ext_id = ret['ext_id']
# 
#     def tearDown(self):
#         self.client.close()
# 
#     def test_popup(self):
#         # keeping only 'balance' to get tests faster. To be
#         # extended with 'history' and 'debug'
#         labels = ['balance']
#         for l in labels:
#             self.client.get('chrome-extension://' + self.ext_id + '/popup/popup.html#/' + l)
#         self.assertFalse(is_error(self.client))

class BankTestCase(unittest.TestCase):
    """Test withdrawal (after registering a new user)"""
    def setUp(self):
        ret = client_setup()
        self.client = ret['client']
        self.ext_id = ret['ext_id']

    def tearDown(self):
        pass
        # self.client.close()
    

    def test_withdrawal(self):
        bank_url = 'http://127.0.0.1:9898'
        self.client.get(bank_url + '/accounts/register')
        self.client.find_element(By.TAG_NAME, "form")
        register = """\
            var form = document.getElementsByTagName('form')[0];
            form.username.value = '%s';
            form.password.value = 'test';
            form.submit();
            """ % str(int(time.time())) # need fresh username

        self.client.execute_script(register)
        self.assertFalse(is_error(self.client))
        wait = WebDriverWait(self.client, 10)
        button = self.client.find_element(By.ID, "select-exchange")
        button = wait.until(EC.element_to_be_clickable((By.ID, "select-exchange")))
        # click to confirm the amount to withdraw
        button.click()
        # Note: this further 'get()' seems needed to get the in-wallet page loaded
        location = self.client.execute_script("return document.location.href")
        self.client.get(location)
        # Confirm xchg
        button = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[1]")))
        # This click returns the captcha page (put wait?)
        button.click()
        # Note: a wait for getting the inputElem below could be needed
        inputElem = self.client.find_element(By.XPATH, "//input[@name='pin_0']")
        self.assertIsNotNone(inputElem)
        # get the question
        question = self.client.find_element(By.XPATH, "//span[@class='captcha-question']/div")
        questionTok = question.text.split()
        op1 = int(questionTok[2])
        op2 = int(questionTok[4])
        res = {'+': op1 + op2, '-': op1 - op2, u'\u00d7': op1 * op2}
        inputElem.send_keys(res[questionTok[3]])
        form = self.client.find_element(By.TAG_NAME, "form")
        form.submit()
        # check if successful message exists
        msg_succ = self.client.find_element(By.CLASS_NAME, "informational-ok")
        self.assertNotNone(msg_succ)

if __name__ == '__main__':
    unittest.main()
