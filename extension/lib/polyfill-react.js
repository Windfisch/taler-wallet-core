"use strict";
let React = {
    createElement: function (tag, props, ...children) {
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
};
