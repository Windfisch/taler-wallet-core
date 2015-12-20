"use strict";
document.addEventListener('DOMContentLoaded', (e) => {
    console.log("content loaded");
    chrome.runtime.sendMessage({ type: "balances" }, function (wallet) {
        let context = document.getElementById("balance-template").innerHTML;
        let template = Handlebars.compile(context);
        document.getElementById("content").innerHTML = template(wallet);
        console.log("got wallet", JSON.stringify(wallet));
        let el = document.getElementById("link-kudos");
        if (el) {
            el.onclick = (e) => {
                let target = e.target;
                chrome.tabs.create({
                    "url": target.href
                });
            };
        }
    });
    document.getElementById("debug").addEventListener("click", (e) => {
        chrome.tabs.create({
            "url": chrome.extension.getURL("pages/debug.html")
        });
    });
    document.getElementById("reset").addEventListener("click", (e) => {
        chrome.runtime.sendMessage({ type: "reset" });
        window.close();
    });
});
