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

var i18n = <any>function i18n(strings, ...values) {
  init();
  console.log('i18n:', strings[0]);
  return jed.translate(strings[0]).fetch();
};

i18n.lang = chrome.i18n.getUILanguage();
i18n.strings = {};

// Interpolate i8nized values with arbitrary objects and
// return array of strings/objects.
i18n.parts = function(strings, ...values) {
  init();
  let str = '';
  for (let i = 0; i < strings.length; i++) {
    str += strings[i];
    if (i < strings.length - 1) {
      str += '%'+ (i+1) +'$s';
    }
  }
  console.log('i18n.parts:', str, ...values[0].children);
  return jed.translate(str).fetch(...values[0].children);
};
