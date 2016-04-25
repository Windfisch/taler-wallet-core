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
    evt = new CustomEvent('taler-query-id');
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

labels = ['balance']
for l in labels:
    client.get('chrome-extensio://' + ext_id + '/popup/popup.html#/' + l)
for log_type in ['browser']:
    for log in client.get_log(log_type):
        print(log['level'] + ': ' + log['message'])
