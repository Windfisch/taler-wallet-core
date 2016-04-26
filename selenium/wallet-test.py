from selenium import webdriver
import time
import unittest


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
          window['extId'] = evt.detail.id;    
        }); 
        var evt = new CustomEvent('taler-query-id');
        document.dispatchEvent(evt);
        """
    client.execute_script(listener)
    poll = """\
        if(window.extId)
          return window.extId;
        else return false;
        """
    # Todo: put some delay in polling
    ext_id = client.execute_script(poll)
    return {'client': client, 'ext_id': ext_id}


def is_error(client):
    """In case of errors in the browser, print them and return True"""
    for log_type in ['browser']:
        for log in client.get_log(log_type):
            if log['level'] is 'error':
                print(log['level'] + ': ' + log['message'])
                return True



class PopupTestCase(unittest.TestCase):
    """Test wallet's popups"""
    def setUp(self):
        ret = client_setup()
        self.client = ret['client']
        self.ext_id = ret['ext_id']

    def tearDown(self):
        self.client.close()

    def test_popup(self):
        # keeping only 'balance' to get tests faster. To be
        # extended with 'history' and 'debug'
        labels = ['balance']
        for l in labels:
            self.client.get('chrome-extension://' + self.ext_id + '/popup/popup.html#/' + l)
        self.assertNotEqual(True, is_error(self.client))

class BankTestCase(unittest.TestCase):
    """Test withdrawal (after registering a new user)"""
    def setUp(self):
        ret = client_setup()
        self.client = ret['client']
        self.ext_id = ret['ext_id']

    def tearDown(self):
        self.client.close()
    

    def test_withdrawal(self):
        bank_url = 'http://127.0.0.1:9898'
        self.client.get(bank_url + '/accounts/register')

        register = """\
            var form = document.getElementsByTagName('form')[0];
            form.username.value = '%s';
            form.password.value = 'test';
            form.submit();
            """ % str(int(time.time())) # need fresh username

        self.client.execute_script(register)
        self.assertNotEqual(True, is_error(self.client))

if __name__ == '__main__':
    unittest.main()
