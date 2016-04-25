from selenium import webdriver
import time

co = webdriver.ChromeOptions()
co.add_argument("load-extension=/home/marcello/Taler/wallet-webex")
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
# TODO intelligent poller needed
time.sleep(1)
ext_id = client.execute_script(poll)

# if client has error from its activity, ptints it and returns True
def is_error(client):
    for log_type in ['browser']:
        for log in client.get_log(log_type):
            if log['level'] is 'error':
                print(log['level'] + ': ' + log['message'])
                return True


labels = ['balance']
# labels = ['balance', 'history', 'debug']
for l in labels:
    client.get('chrome-extension://' + ext_id + '/popup/popup.html#/' + l)

# TODO assert here
is_error(client)

# visit bank and trigger withdrawal
client.get('https://bank.test.taler.net')
client.get('https://bank.test.taler.net/accounts/register')

register = """\
    var form = document.getElementsByTagName('form');
    form.username.value = 'test';
    form.password.value = 'test';
    form.submit();
    """

# TODO assert here
client.execute_script(register)
