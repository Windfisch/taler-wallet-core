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
var jed;

function init () {
  if ('object' != typeof jed) {
    if (!(i18n.lang in i18n.strings)) {
      i18n.lang = 'en-US';
    }
    jed = new window['Jed'] (i18n.strings[i18n.lang]);
  }
}

function toI18nString (strings) {
  let str = '';
  for (let i = 0; i < strings.length; i++) {
    str += strings[i];
    if (i < strings.length - 1) {
      str += '%'+ (i+1) +'$s';
    }
  }
  return str;
}

function getPluralValue (values) {
  // use the first number in values to determine plural form
  for (let i = 0; i < values.length; i++) {
    if ('number' == typeof values[i]) {
      return values[i];
    }
  }
  return 1;
}

var i18n = <any>function i18n(strings, ...values) {
  init();
  let str = toI18nString (strings);
  let n = getPluralValue (values);
  let tr = jed.translate(str).ifPlural(n, str).fetch(...values);
  console.log('i18n:', 'n: ', n, 'strings:', strings, 'values:', values);
  console.log('i18n:', 'str:', str);
  console.log('i18n:', 'tr:', tr);
  return tr;
};

i18n.lang = chrome.i18n.getUILanguage();
i18n.strings = {};

// Interpolate i18nized values with arbitrary objects and
// return array of strings/objects.
i18n.parts = function(strings, ...values) {
  init();
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

  console.log('i18n.parts:', 'n: ', n, 'strings:', strings, 'values:', values);
  console.log('i18n.parts:', 'str:', str);
  console.log('i18n.parts:', 'parts:', parts);
  return parts;
};
