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

  function checkNumber(target, prop): any {
    if ((typeof target) !== "number") {
      throw Error("number expected for " + prop.propertyKey);
    }
    return target;
  }

  function checkString(target, prop): any {
    if (typeof target !== "string") {
      throw Error("string expected for " + prop.propertyKey);
    }
    return target;
  }

  function checkAnyObject(target, prop): any {
    if (typeof target !== "object") {
      throw Error("object expected for " + prop.propertyKey);
    }
    return target;
  }

  function checkValue(target, prop): any {
    let type = prop.type;
    if (!type) {
      throw Error("assertion failed");
    }
    let v = target;
    if (!v || typeof v !== "object") {
      throw Error("expected object for " + prop.propertyKey);
    }
    let props = type.prototype[chkSym].props;
    let remainingPropNames = new Set(Object.getOwnPropertyNames(v));
    let obj = new type();
    for (let prop of props) {
      if (!remainingPropNames.has(prop.propertyKey)) {
        throw Error("Property missing: " + prop.propertyKey);
      }
      if (!remainingPropNames.delete(prop.propertyKey)) {
        throw Error("assertion failed");
      }
      let propVal = v[prop.propertyKey];
      obj[prop.propertyKey] = prop.checker(propVal, prop);
    }

    if (remainingPropNames.size != 0) {
      throw Error("superfluous properties " + JSON.stringify(Array.from(
                    remainingPropNames.values())));
    }
    return obj;
  }

  export function Class(target) {
    target.checked = (v) => {
      return checkValue(v, {
        propertyKey: "(root)",
        type: target,
        checker: checkValue
      });
    };
    return target;
  }

  export function Value(type) {
    function deco(target: Object, propertyKey: string | symbol): void {
      let chk = mkChk(target);
      chk.props.push({
                       propertyKey: propertyKey,
                       checker: checkValue,
                       type: type
                     });
    }

    return deco;
  }

  export function List(type) {
    function deco(target: Object, propertyKey: string | symbol): void {
      throw Error("not implemented");
    }

    return deco;
  }

  export function Number(target: Object, propertyKey: string | symbol): void {
    let chk = mkChk(target);
    chk.props.push({propertyKey: propertyKey, checker: checkNumber});
  }

  export function AnyObject(target: Object, propertyKey: string | symbol): void {
    let chk = mkChk(target);
    chk.props.push({propertyKey: propertyKey, checker: checkAnyObject});
  }

  export function String(target: Object, propertyKey: string | symbol): void {
    let chk = mkChk(target);
    chk.props.push({propertyKey: propertyKey, checker: checkString});
  }

  function mkChk(target) {
    let chk = target[chkSym];
    if (!chk) {
      chk = {props: []};
      target[chkSym] = chk;
    }
    return chk;
  }
}
