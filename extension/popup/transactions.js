'use strict';

function add_transaction (date, currency, amount, status, contract)
{
  let table = document.getElementById('transactions-table');
  table.className = table.className.replace(/\bhidden\b/, '');
  let tr = document.createElement('tr');
  table.appendChild(tr);

  let td_date = document.createElement('td');
  td_date.className = 'date';
  let text_date = document.createTextNode(date_format (date));
  tr.appendChild(td_date).appendChild(text_date);

  let td_amount = document.createElement('td');
  td_amount.className = 'amount';
  let text_amount = document.createTextNode(amount +' '+ currency);
  tr.appendChild(td_amount).appendChild(text_amount);

  let td_status = document.createElement('td');
  td_status.className = 'status';
  let text_status = document.createTextNode(status);
  tr.appendChild(td_status).appendChild(text_status);

  let td_contract = document.createElement('td');
  td_contract.className = 'contract';
  let btn_contract = document.createElement('button');
  btn_contract.appendChild(document.createTextNode('Contract'));
  tr.appendChild(td_contract).appendChild(btn_contract);
}

document.addEventListener('DOMContentLoaded', function () {
  let no = document.getElementById('no-transactions');

  // FIXME
  no.className += ' hidden';
  add_transaction (new Date('2015-12-21 13:37'), 'EUR', 42, 'Completed', {});
  add_transaction (new Date('2015-12-22 10:01'), 'USD', 23, 'Pending', {});
});
