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

