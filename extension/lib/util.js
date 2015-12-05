'use strict';

/**
 * Format amount as String.
 *
 * @param amount
 *        Amount to be formatted.
 *
 * @return String, e.g. "1.23"
 */
function amount_format (amount)
{
  let separator = "." // FIXME: depends on locale
  return amount.value + separator + amount.fraction.toString().replace(/0+$/, "");
}


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
    fraction: Math.round(parseFloat(matches[2] || 0) * 1000000),
    currency: matches[3],
  };
}


/**
 * Format amount with currency as String.
 *
 * @param amount
 *        Amount to be formatted.
 *
 * @return String, e.g. "1.23 EUR"
 */
function amount_format_currency (amount)
{
  return amount_format(amount) + " " + amount.currency;
}


/**
 * Convert Date to String.
 *
 * Format: YYYY-MM-DD HH:mm
 *
 * @param date
 *        Date to be converted.
 *
 * @return String
 */
function date_format (date)
{
  function pad (number) {
    if (number < 10) {
      return '0' + number;
    }
    return number;
  }

  return date.getUTCFullYear() +
    '-' + pad(date.getUTCMonth() + 1) +
    '-' + pad(date.getUTCDate()) +
    ' ' + pad(date.getUTCHours()) +
    ':' + pad(date.getUTCMinutes());
  //':' + pad(date.getUTCSeconds());
}


/**
 * Send HTTP request.
 *
 * @param method
 *        HTTP method.
 * @param url
 *        URL to send to.
 * @param content
 *        Content of request.
 * @param content_type
 *        Content-Type HTTP header.
 * @param onsuccess
 *        Function called by XMLHttpRequest on success.
 * @param onerror
 *        Function called by XMLHttpRequest on error.
 *
 */
function http_req (method, url, content, content_type, onsuccess, onerror) {
  var req = new XMLHttpRequest();

  req.onload = function(mintEvt) {
    if (req.readyState == 4)
      onsuccess(req.status, req.responseText);
  };

  req.onerror = onerror;
  req.open(method, url, true);
  req.setRequestHeader('Content-Type', content_type);
  req.send(content);

  return req;
}
