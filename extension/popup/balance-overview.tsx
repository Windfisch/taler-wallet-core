"use strict";

let React = {
  createElement: function(tag, props, ...children) {
    let e = document.createElement(tag);
    for (let k in props) {
      e.setAttribute(k, props[k]);
    }
    for (let child of children) {
      if ("string" === typeof child || "number" == typeof child) {
        child = document.createTextNode(child);
      }
      e.appendChild(child);
    }
    return e;
  }
}

document.addEventListener('DOMContentLoaded', (e) => {
  console.log("content loaded");
  chrome.runtime.sendMessage({type: "balances"}, function(wallet) {
    console.log("got balance");
    let n = 0;
    /*let table = <div />;*/
    
    let source = document.getElementById("balance-template").innerHTML;
    console.log("size", Object.keys(wallet).length);
    if (Object.keys(wallet).length > 0){
      let template = Handlebars.compile(source);
      console.log("DB error? ", chrome.runtime.lastError);
      console.log("wallet ", JSON.stringify(wallet));
      let html = template({wallet: wallet, walletEmpty: wallet.length == 0});
      console.log("Hb generated html", html);
      document.getElementById("content").innerHTML = html;
    }

    /*
    for (let curr in wallet) {
      n++;
      let x = wallet[curr];
      let num = x.value + x.fraction / 10e6;
      table.appendChild(<p>{num} <a>{x.currency}</a></p>);
    }
    if (n != 0) {
      let p = document.getElementById("content");
      p.replaceChild(table, p.firstElementChild);
    } */
  });

  document.getElementById("debug").addEventListener("click", (e) => {
    chrome.tabs.create({
      "url": chrome.extension.getURL("pages/debug.html")
    }); 
  });
  document.getElementById("reset").addEventListener("click", (e) => {
    chrome.runtime.sendMessage({type: "reset"});
  });
  document.getElementById("link-kudos").addEventListener("click", (e) => {
    let target: any = e.target;
    chrome.tabs.create({
      "url": target.href
    }); 
  });
});
