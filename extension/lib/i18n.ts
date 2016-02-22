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

declare var i18n: any;

var i18n = <any>function i18n(strings, ...values) {
  i18n['init']();
  //console.log('i18n:', ...strings, ...values)
  return i18n['jed'].translate(strings[0]).fetch(...values);
  //return String.raw(strings, ...values);
};

i18n.lang = chrome.i18n.getUILanguage();
i18n.jed = null;
i18n.strings = {};

i18n.init = function() {
  if (null == i18n.jed) {
    i18n.jed = new window['Jed'] (i18n.strings[i18n.lang]);
  }
}

// Interpolate i8nized values with arbitrary objects and
// return array of strings/objects.
i18n.parts = function(strings, ...values) {
  let parts = [];

  for (let i = 0; i < strings.length; i++) {
    parts.push(strings[i]);
    if (i < values.length) {
      parts.push(values[i]);
    }
  }

  return parts;
};
