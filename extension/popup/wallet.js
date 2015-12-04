'use strict';

var selected_currency = 'EUR'; // FIXME

function select_currency (checkbox, currency, amount)
{
  selected_currency = currency;

  if (checkbox.checked)
  {
    let inputs = document.getElementsByTagName('input');
    for (let i = 0; i < inputs.length; i++)
    {
      let input = inputs[i];
      if (input != checkbox)
        input.checked = false;
    }
    chrome.browserAction.setBadgeText({text: amount.toString()})
    chrome.browserAction.setTitle({title: 'Taler: ' + amount + ' ' + currency});
  }
  else
  {
    chrome.browserAction.setBadgeText({text: ''})
    chrome.browserAction.setTitle({title: 'Taler'});
  }
}


function add_currency (currency, amount)
{
  let empty = document.getElementById('wallet-empty');
  if (! /\bhidden\b/.test(empty.className))
    empty.className += ' hidden';

  let table = document.getElementById('wallet-table');
  table.className = table.className.replace(/\bhidden\b/, '');

  let tr = document.createElement('tr');
  tr.id = 'wallet-table-'+ currency;
  table.appendChild(tr);

  let td_amount = document.createElement('td');
  td_amount.id = 'wallet-currency-'+ currency +'-amount';
  td_amount.className = 'amount';
  let text_amount = document.createTextNode(amount);
  tr.appendChild(td_amount).appendChild(text_amount);

  let td_currency = document.createElement('td');
  td_currency.id = 'wallet-table-'+ currency +'-currency';
  td_currency.className = 'currency';
  let text_currency = document.createTextNode(currency);
  tr.appendChild(td_currency).appendChild(text_currency);

  let td_select = document.createElement('td');
  td_select.id = 'wallet-table-'+ currency +'-select';
  td_select.className = 'select';
  let checkbox = document.createElement('input');
  checkbox.id = 'wallet-table-'+ currency +'-checkbox';
  checkbox.setAttribute('type', 'checkbox');
  if (currency == selected_currency)
    checkbox.checked = true;
  tr.appendChild(td_select).appendChild(checkbox);

  checkbox._amount = amount;
  checkbox.addEventListener('click', function () {
    select_currency(this, currency, this._amount);
  });
}

function update_currency (currency, amount)
{
  let td_amount = document.getElementById('wallet-currency-'+ currency +'-amount');
  let text_amount = document.createTextNode(amount);
  td_amount.removeChild(td_amount.firstChild);
  td_amount.appendChild(text_amount);

  let checkbox = document.getElementById('wallet-table-'+ currency +'-checkbox');
  checkbox._amount = amount;
}

document.addEventListener(
  'DOMContentLoaded',
  function () {
    chrome.runtime.sendMessage({type: "WALLET_GET"}, function(wallet) {
      for (let currency in wallet)
      {
        let amount = amount_format(wallet[currency]);
        add_currency(currency, amount);
      }
    });

    // FIXME: remove
    add_currency('EUR', 42);
    add_currency('USD', 17);
    add_currency('KUD', 1337);
    update_currency('USD', 23);
  });
