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

'use strict';

/**
 * Parse an amount that is specified like '5.42 EUR'.
 * Returns a {currency,value,fraction} object or null
 * if the input is invalid.
 */
function amount_parse_pretty(s) {
  let pattern = /(\d+)(.\d+)?\s*([a-zA-Z]+)/;
  let matches = pattern.exec(s);
  if (null == matches) {
    return null;
  }
  return {
    // Always succeeds due to regex
    value: parseInt(matches[1]),
    // Should we warn / fail on lost precision?
    fraction: Math.round(parseFloat(matches[2] || "0") * 1000000),
    currency: matches[3],
  };
}


function format(s: string, ...args: any[]) {
  function r(m, n) {
    let i = parseInt(n);
    return args[i];
  }
  s = s.replace(/{{/g, '{');
  s = s.replace(/}}/g, '}');
  s = s.replace(/{([0-9]+)}/g, r);
  return s;
}


function promiseFinally<T>(p: Promise<T>, fn): Promise<T> {
  return p.then((x) => { fn(); return x; })
          .catch((e) => {fn(); throw e;});
}