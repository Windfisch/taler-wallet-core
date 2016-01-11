/*
 This file is part of TALER
 (C) 2016 GNUnet e.V.

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
 * Implement the "React" namespace so that we can use TSX literals.
 * Just returns plain DOM elements, no fancy virtual DOM.
 */

"use strict";

let React = {
  createElement: function(tag, props, ...children) {
    let e = document.createElement(tag);
    for (let k in props) {
      e.setAttribute(k, props[k]);
    }
    for (let child of children) {
      if ("string" === typeof child || "number" === typeof child) {
        child = document.createTextNode(child);
      }
      e.appendChild(child);
    }
    return e;
  }
};


