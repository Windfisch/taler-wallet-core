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

export namespace Checkable {
  export function SchemaError(message) {
    this.name = 'SchemaError';
    this.message = message;
    this.stack = (<any>new Error()).stack;
  }

  SchemaError.prototype = new Error;

  let chkSym = Symbol("checkable");


  function checkNumber(target, prop, path): any {
    if ((typeof target) !== "number") {
      throw new SchemaError(`expected number for ${path}`);
    }
    return target;
  }


  function checkString(target, prop, path): any {
    if (typeof target !== "string") {
      throw new SchemaError(`expected string for ${path}, got ${typeof target} instead`);
    }
    return target;
  }


  function checkAnyObject(target, prop, path): any {
    if (typeof target !== "object") {
      throw new SchemaError(`expected (any) object for ${path}, got ${typeof target} instead`);
    }
    return target;
  }


  function checkAny(target, prop, path): any {
    return target;
  }


  function checkList(target, prop, path): any {
    if (!Array.isArray(target)) {
      throw new SchemaError(`array expected for ${path}, got ${typeof target} instead`);
    }
    for (let i = 0; i < target.length; i++) {
      let v = target[i];
      prop.elementChecker(v, prop.elementProp, path.concat([i]));
    }
    return target;
  }


  function checkValue(target, prop, path): any {
    let type = prop.type;
    if (!type) {
      throw Error(`assertion failed (prop is ${JSON.stringify(prop)})`);
    }
    let v = target;
    if (!v || typeof v !== "object") {
      throw new SchemaError(`expected object for ${path}, got ${typeof v} instead`);
    }
    let props = type.prototype[chkSym].props;
    let remainingPropNames = new Set(Object.getOwnPropertyNames(v));
    let obj = new type();
    for (let prop of props) {
      if (!remainingPropNames.has(prop.propertyKey)) {
        if (prop.optional) {
          continue;
        }
        throw new SchemaError("Property missing: " + prop.propertyKey);
      }
      if (!remainingPropNames.delete(prop.propertyKey)) {
        throw new SchemaError("assertion failed");
      }
      let propVal = v[prop.propertyKey];
      obj[prop.propertyKey] = prop.checker(propVal,
                                           prop,
                                           path.concat([prop.propertyKey]));
    }

    if (remainingPropNames.size != 0) {
      throw new SchemaError("superfluous properties " + JSON.stringify(Array.from(
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
      }, []);
    };
    return target;
  }


  export function Value(type) {
    if (!type) {
      throw Error("Type does not exist yet (wrong order of definitions?)");
    }
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
    let stub = {};
    type(stub, "(list-element)");
    let elementProp = mkChk(stub).props[0];
    let elementChecker = elementProp.checker;
    if (!elementChecker) {
      throw Error("assertion failed");
    }
    function deco(target: Object, propertyKey: string | symbol): void {
      let chk = mkChk(target);
      chk.props.push({
                       elementChecker,
                       elementProp,
                       propertyKey: propertyKey,
                       checker: checkList,
                     });
    }

    return deco;
  }


  export function Number(target: Object, propertyKey: string | symbol): void {
    let chk = mkChk(target);
    chk.props.push({propertyKey: propertyKey, checker: checkNumber});
  }


  export function AnyObject(target: Object,
                            propertyKey: string | symbol): void {
    let chk = mkChk(target);
    chk.props.push({
                     propertyKey: propertyKey,
                     checker: checkAnyObject
                   });
  }


  export function Any(target: Object,
                      propertyKey: string | symbol): void {
    let chk = mkChk(target);
    chk.props.push({
                     propertyKey: propertyKey,
                     checker: checkAny,
                     optional: true
                   });
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