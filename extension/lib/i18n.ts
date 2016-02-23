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
  // TODO: actually look up translation
  return String.raw(strings, ...values);
};

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

