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
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */


"use strict";

/**
 * Decorators for type-checking JSON into
 * an object.
 * @module Checkable
 * @author Florian Dold
 */

export namespace Checkable {

  type Path = (number | string)[];

  interface SchemaErrorConstructor {
    new (err: string): SchemaError;
  }

  interface SchemaError {
    name: string;
    message: string;
  }

  interface Prop {
    propertyKey: any;
    checker: any;
    type?: any;
    elementChecker?: any;
    elementProp?: any;
    keyProp?: any;
    valueProp?: any;
    optional?: boolean;
    extraAllowed?: boolean;
  }

  interface CheckableInfo {
    props: Prop[];
  }

  export let SchemaError = (function SchemaError(message: string) {
    this.name = 'SchemaError';
    this.message = message;
    this.stack = (<any>new Error()).stack;
  }) as any as SchemaErrorConstructor;


  SchemaError.prototype = new Error;

  /**
   * Classes that are checkable are annotated with this
   * checkable info symbol, which contains the information necessary
   * to check if they're valid.
   */
  let checkableInfoSym = Symbol("checkableInfo");

  /**
   * Get the current property list for a checkable type.
   */
  function getCheckableInfo(target: any): CheckableInfo {
    let chk = target[checkableInfoSym] as CheckableInfo|undefined;
    if (!chk) {
      chk = { props: [] };
      target[checkableInfoSym] = chk;
    }
    return chk;
  }


  function checkNumber(target: any, prop: Prop, path: Path): any {
    if ((typeof target) !== "number") {
      throw new SchemaError(`expected number for ${path}`);
    }
    return target;
  }


  function checkString(target: any, prop: Prop, path: Path): any {
    if (typeof target !== "string") {
      throw new SchemaError(`expected string for ${path}, got ${typeof target} instead`);
    }
    return target;
  }

  function checkBoolean(target: any, prop: Prop, path: Path): any {
    if (typeof target !== "boolean") {
      throw new SchemaError(`expected boolean for ${path}, got ${typeof target} instead`);
    }
    return target;
  }


  function checkAnyObject(target: any, prop: Prop, path: Path): any {
    if (typeof target !== "object") {
      throw new SchemaError(`expected (any) object for ${path}, got ${typeof target} instead`);
    }
    return target;
  }


  function checkAny(target: any, prop: Prop, path: Path): any {
    return target;
  }


  function checkList(target: any, prop: Prop, path: Path): any {
    if (!Array.isArray(target)) {
      throw new SchemaError(`array expected for ${path}, got ${typeof target} instead`);
    }
    for (let i = 0; i < target.length; i++) {
      let v = target[i];
      prop.elementChecker(v, prop.elementProp, path.concat([i]));
    }
    return target;
  }

  function checkMap(target: any, prop: Prop, path: Path): any {
    if (typeof target !== "object") {
      throw new SchemaError(`expected  object for ${path}, got ${typeof target} instead`);
    }
    for (let key in target) {
      prop.keyProp.checker(key, prop.keyProp, path.concat([key]));
      let value = target[key];
      prop.valueProp.checker(value, prop.valueProp, path.concat([key]));
    }
  }


  function checkOptional(target: any, prop: Prop, path: Path): any {
    console.assert(prop.propertyKey);
    prop.elementChecker(target,
      prop.elementProp,
      path.concat([prop.propertyKey]));
    return target;
  }


  function checkValue(target: any, prop: Prop, path: Path): any {
    let type = prop.type;
    if (!type) {
      throw Error(`assertion failed (prop is ${JSON.stringify(prop)})`);
    }
    let v = target;
    if (!v || typeof v !== "object") {
      throw new SchemaError(
        `expected object for ${path.join(".")}, got ${typeof v} instead`);
    }
    let props = type.prototype[checkableInfoSym].props;
    let remainingPropNames = new Set(Object.getOwnPropertyNames(v));
    let obj = new type();
    for (let prop of props) {
      if (!remainingPropNames.has(prop.propertyKey)) {
        if (prop.optional) {
          continue;
        }
        throw new SchemaError(`Property ${prop.propertyKey} missing on ${path}`);
      }
      if (!remainingPropNames.delete(prop.propertyKey)) {
        throw new SchemaError("assertion failed");
      }
      let propVal = v[prop.propertyKey];
      obj[prop.propertyKey] = prop.checker(propVal,
        prop,
        path.concat([prop.propertyKey]));
    }

    if (!prop.extraAllowed && remainingPropNames.size != 0) {
      throw new SchemaError("superfluous properties " + JSON.stringify(Array.from(
        remainingPropNames.values())));
    }
    return obj;
  }


  export function Class(target: any) {
    target.checked = (v: any) => {
      return checkValue(v, {
        propertyKey: "(root)",
        type: target,
        checker: checkValue
      }, ["(root)"]);
    };
    return target;
  }

  export function ClassWithExtra(target: any) {
    target.checked = (v: any) => {
      return checkValue(v, {
        propertyKey: "(root)",
        type: target,
        extraAllowed: true,
        checker: checkValue
      }, ["(root)"]);
    };
    return target;
  }


  export function ClassWithValidator(target: any) {
    target.checked = (v: any) => {
      let cv = checkValue(v, {
        propertyKey: "(root)",
        type: target,
        checker: checkValue
      }, ["(root)"]);
      let instance = new target();
      if (typeof instance.validate !== "function") {
        throw Error("invalid Checkable annotion: validate method required");
      }
      // May throw exception
      instance.validate.call(cv);
      return cv;
    };
    return target;
  }


  export function Value(type: any) {
    if (!type) {
      throw Error("Type does not exist yet (wrong order of definitions?)");
    }
    function deco(target: Object, propertyKey: string | symbol): void {
      let chk = getCheckableInfo(target);
      chk.props.push({
        propertyKey: propertyKey,
        checker: checkValue,
        type: type
      });
    }

    return deco;
  }


  export function List(type: any) {
    let stub = {};
    type(stub, "(list-element)");
    let elementProp = getCheckableInfo(stub).props[0];
    let elementChecker = elementProp.checker;
    if (!elementChecker) {
      throw Error("assertion failed");
    }
    function deco(target: Object, propertyKey: string | symbol): void {
      let chk = getCheckableInfo(target);
      chk.props.push({
        elementChecker,
        elementProp,
        propertyKey: propertyKey,
        checker: checkList,
      });
    }

    return deco;
  }


  export function Map(keyType: any, valueType: any) {
    let keyStub = {};
    keyType(keyStub, "(map-key)");
    let keyProp = getCheckableInfo(keyStub).props[0];
    if (!keyProp) {
      throw Error("assertion failed");
    }
    let valueStub = {};
    valueType(valueStub, "(map-value)");
    let valueProp = getCheckableInfo(valueStub).props[0];
    if (!valueProp) {
      throw Error("assertion failed");
    }
    function deco(target: Object, propertyKey: string | symbol): void {
      let chk = getCheckableInfo(target);
      chk.props.push({
        keyProp,
        valueProp,
        propertyKey: propertyKey,
        checker: checkMap,
      });
    }

    return deco;
  }


  export function Optional(type: any) {
    let stub = {};
    type(stub, "(optional-element)");
    let elementProp = getCheckableInfo(stub).props[0];
    let elementChecker = elementProp.checker;
    if (!elementChecker) {
      throw Error("assertion failed");
    }
    function deco(target: Object, propertyKey: string | symbol): void {
      let chk = getCheckableInfo(target);
      chk.props.push({
        elementChecker,
        elementProp,
        propertyKey: propertyKey,
        checker: checkOptional,
        optional: true,
      });
    }

    return deco;
  }


  export function Number(target: Object, propertyKey: string | symbol): void {
    let chk = getCheckableInfo(target);
    chk.props.push({ propertyKey: propertyKey, checker: checkNumber });
  }


  export function AnyObject(target: Object, propertyKey: string | symbol): void {
    let chk = getCheckableInfo(target);
    chk.props.push({
      propertyKey: propertyKey,
      checker: checkAnyObject
    });
  }


  export function Any(target: Object, propertyKey: string | symbol): void {
    let chk = getCheckableInfo(target);
    chk.props.push({
      propertyKey: propertyKey,
      checker: checkAny,
      optional: true
    });
  }


  export function String(target: Object, propertyKey: string | symbol): void {
    let chk = getCheckableInfo(target);
    chk.props.push({ propertyKey: propertyKey, checker: checkString });
  }

  export function Boolean(target: Object, propertyKey: string | symbol): void {
    let chk = getCheckableInfo(target);
    chk.props.push({ propertyKey: propertyKey, checker: checkBoolean });
  }


}
