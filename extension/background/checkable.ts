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

/**
 * Decorators for type-checking JSON into
 * an object.
 * @module Checkable
 * @author Florian Dold
 */


namespace Checkable {
  let chkSym = Symbol("checkable");

  function checkNumber(target, prop) {
    return true;
  }

  function checkString(target, prop) {
    return true;
  }

  export function Class(target) {
    target.checked = (v) => {
      let props = target.prototype[chkSym].props;
      console.log("hello, world");
      let remainingPropNames = new Set(Object.getOwnPropertyNames(v));

      for (let prop of props) {
        remainingPropNames.delete(prop);
        console.log("prop", prop);
      }

      if (remainingPropNames.size != 0) {
        throw Error("superfluous properties " + JSON.stringify(remainingPropNames.values()));
      }
    };
    return target;
  }

  export function Value(type) {
    function deco(target) {
    }

    return deco;
  }

  export function List(type) {
    function deco(target) {
    }

    return deco;
  }

  export function Number(target: Object, propertyKey: string | symbol): void {
    let chk = target[chkSym];
    if (!chk) {
      chk = {props: []};
      target[chkSym] = chk;
    }
    chk.props.push({propertyKey: propertyKey, checker: checkNumber});
  }

  export function String(target: Object, propertyKey: string | symbol): void {
    let chk = target[chkSym];
    if (!chk) {
      chk = {props: []};
      target[chkSym] = chk;
    }
    chk.props.push({propertyKey: propertyKey, checker: checkString});
  }
}
