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

"use strict";

declare var i18n: any;

const JedModule = window["Jed"];
var jed;
var i18nDebug = false;


/** Initialize Jed */
function init () {
  if ("object" === typeof jed) {
    return;
  }
  if ("function" !== typeof JedModule) {
    return;
  }

  if (!(i18n.lang in i18n.strings)) {
    i18n.lang = "en-US";
  }
  jed = new JedModule(i18n.strings[i18n.lang]);

  if (i18nDebug) {
    let link = m("a[href=https://demo.taler.net]", i18n`free KUDOS`);
    let amount = 5, currency = "EUR", date = new Date(), text = "demo.taler.net";
    console.log(i18n`Your balance on ${date} is ${amount} KUDO. Get more at ${text}`);
    console.log(i18n.parts`Your balance on ${date} is ${amount} KUDO. Get more at ${link}`);
    console.log(i18n.pluralize(i18n`Your balance is ${amount} KUDO.`,
                               i18n`Your balance is ${amount} KUDOs.`));
  }
}


/** Convert template strings to a msgid */
function toI18nString(strings) {
  let str = "";
  for (let i = 0; i < strings.length; i++) {
    str += strings[i];
    if (i < strings.length - 1) {
      str += "%"+ (i+1) +"$s";
    }
  }
  return str;
}


/** Use the first number in values to determine plural form */
function getPluralValue (values) {
  for (let i = 0; i < values.length; i++) {
    if ('number' === typeof values[i]) {
      return values[i];
    }
  }
  return 1;
}


var i18n = <any>function i18n(strings, ...values) {
  init();
  if ("object" !== typeof jed) {
    // Fallback implementation in case i18n lib is not there
    return String.raw(strings, ...values);
  }

  let str = toI18nString (strings);
  let n = getPluralValue (values);
  let tr = jed.translate(str).ifPlural(n, str).fetch(...values);
  if (i18nDebug) {
    console.log('i18n:', 'n: ', n, 'strings:', strings, 'values:', values);
    console.log('i18n:', 'str:', str);
    console.log('i18n:', 'tr:', tr);
  }
  return tr;
};

i18n.lang = chrome.i18n.getUILanguage();
i18n.strings = {};


/**
 * Interpolate i18nized values with arbitrary objects.
 * @return Array of strings/objects.
 */
i18n.parts = function(strings, ...values) {
  init();
  if ("object" !== typeof jed) {
    // Fallback implementation in case i18n lib is not there
    let parts = [];

    for (let i = 0; i < strings.length; i++) {
      parts.push(strings[i]);
      if (i < values.length) {
        parts.push(values[i]);
      }
    }
    return parts;
  }

  let str = toI18nString (strings);
  let n = getPluralValue (values);
  let tr = jed.ngettext(str, str, n).split(/%(\d+)\$s/);
  let parts = [];
  for (let i = 0; i < tr.length; i++) {
    if (0 == i % 2) {
      parts.push(tr[i]);
    } else {
      parts.push(values[parseInt(tr[i]) - 1]);
    }
  }

  if (i18nDebug) {
    console.log('i18n.parts:', 'n: ', n, 'strings:', strings, 'values:', values);
    console.log('i18n.parts:', 'str:', str);
    console.log('i18n.parts:', 'parts:', parts);
  }
  return parts;
};


/**
 * Pluralize based on first numeric parameter in the template.
 * @todo The plural argument is used for extraction by pogen.js
 */
i18n.pluralize = function (singular, plural) {
  return singular;
};
