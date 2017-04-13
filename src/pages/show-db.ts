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
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */


/**
 * Wallet database dump for debugging.
 *
 * @author Florian Dold
 */

function replacer(match: string, pIndent: string, pKey: string, pVal: string,
                  pEnd: string) {
  var key = '<span class=json-key>';
  var val = '<span class=json-value>';
  var str = '<span class=json-string>';
  var r = pIndent || '';
  if (pKey) {
    r = r + key + '"' + pKey.replace(/[": ]/g, '') + '":</span> ';
  }
  if (pVal) {
    r = r + (pVal[0] == '"' ? str : val) + pVal + '</span>';
  }
  return r + (pEnd || '');
}


function prettyPrint(obj: any) {
  var jsonLine = /^( *)("[\w]+": )?("[^"]*"|[\w.+-]*)?([,[{])?$/mg;
  return JSON.stringify(obj, null as any, 3)
             .replace(/&/g, '&amp;').replace(/\\"/g, '&quot;')
             .replace(/</g, '&lt;').replace(/>/g, '&gt;')
             .replace(jsonLine, replacer);
}


document.addEventListener("DOMContentLoaded", () => {
  chrome.runtime.sendMessage({type: 'dump-db'}, (resp) => {
    const el = document.getElementById('dump');
    if (!el) {
      throw Error();
    }
    el.innerHTML = prettyPrint(resp);

    document.getElementById("download")!.addEventListener("click", (evt) => {
      console.log("creating download");
      let element = document.createElement("a");
      element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(JSON.stringify(resp)));
      element.setAttribute("download", "wallet-dump.txt");
      element.style.display = "none";
      document.body.appendChild(element);
      element.click();
    });

  });


  let fileInput = document.getElementById("fileInput")! as HTMLInputElement;
  fileInput.onchange = (evt) => {
    if (!fileInput.files || fileInput.files.length != 1) {
      alert("please select exactly one file to import");
      return;
    }
    const file = fileInput.files[0];
    const fr = new FileReader();
    fr.onload = (e: any) => {
      console.log("got file");
      let dump = JSON.parse(e.target.result);
      console.log("parsed contents", dump);
      chrome.runtime.sendMessage({ type: 'import-db', detail: { dump } }, (resp) => {
        alert("loaded");
      });
    };
    console.log("reading file", file);
    fr.readAsText(file);
  };

  document.getElementById("import")!.addEventListener("click", (evt) => {
    fileInput.click();
    evt.preventDefault();
  });
});
