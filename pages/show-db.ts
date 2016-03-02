/*
 This file is part of TALER
 (C) 2015 GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, If not, see <http://www.gnu.org/licenses/>
 */


/**
 * Wallet database dump for debugging.
 *
 * @author Florian Dold
 */

function replacer(match, pIndent, pKey, pVal, pEnd) {
  var key = '<span class=json-key>';
  var val = '<span class=json-value>';
  var str = '<span class=json-string>';
  var r = pIndent || '';
  if (pKey)
     r = r + key + pKey.replace(/[": ]/g, '') + '</span>: ';
  if (pVal)
     r = r + (pVal[0] == '"' ? str : val) + pVal + '</span>';
  return r + (pEnd || '');
}


function prettyPrint(obj) {
  var jsonLine = /^( *)("[\w]+": )?("[^"]*"|[\w.+-]*)?([,[{])?$/mg;
  return JSON.stringify(obj, null, 3)
     .replace(/&/g, '&amp;').replace(/\\"/g, '&quot;')
     .replace(/</g, '&lt;').replace(/>/g, '&gt;')
     .replace(jsonLine, replacer);
}


document.addEventListener("DOMContentLoaded", (e) => {
  chrome.runtime.sendMessage({type:'dump-db'}, (resp) => {
    document.getElementById('dump').innerHTML = prettyPrint(resp);
  });
});
