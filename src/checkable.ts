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
 * Decorators for validating JSON objects and converting them to a typed
 * object.
 *
 * The decorators are put onto classes, and the validation is done
 * via a static method that is filled in by the annotation.
 *
 * Example:
 * ```
 *  @Checkable.Class
 *  class Person {
 *    @Checkable.String
 *    name: string;
 *    @Checkable.Number
 *    age: number;
 *
 *    // Method will be implemented automatically
 *    static checked(obj: any): Person;
 *  }
 * ```
 */
export namespace Checkable {

  type Path = Array<number | string>;

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

  // tslint:disable-next-line:no-shadowed-variable
  export const SchemaError = (function SchemaError(this: any, message: string) {
    const that: any = this as any;
    that.name = "SchemaError";
    that.message = message;
    that.stack = (new Error() as any).stack;
  }) as any as SchemaErrorConstructor;


  SchemaError.prototype = new Error();

  /**
   * Classes that are checkable are annotated with this
   * checkable info symbol, which contains the information necessary
   * to check if they're valid.
   */
  const checkableInfoSym = Symbol("checkableInfo");

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
      const v = target[i];
      prop.elementChecker(v, prop.elementProp, path.concat([i]));
    }
    return target;
  }

  function checkMap(target: any, prop: Prop, path: Path): any {
    if (typeof target !== "object") {
      throw new SchemaError(`expected  object for ${path}, got ${typeof target} instead`);
    }
    for (const key in target) {
      prop.keyProp.checker(key, prop.keyProp, path.concat([key]));
      const value = target[key];
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
    const type = prop.type;
    const typeName = type.name || "??";
    if (!type) {
      throw Error(`assertion failed (prop is ${JSON.stringify(prop)})`);
    }
    const v = target;
    if (!v || typeof v !== "object") {
      throw new SchemaError(
        `expected object for ${path.join(".")}, got ${typeof v} instead`);
    }
    const props = type.prototype[checkableInfoSym].props;
    const remainingPropNames = new Set(Object.getOwnPropertyNames(v));
    const obj = new type();
    for (const innerProp of props) {
      if (!remainingPropNames.has(innerProp.propertyKey)) {
        if (innerProp.optional) {
          continue;
        }
        throw new SchemaError(`Property ${innerProp.propertyKey} missing on ${path} of ${typeName}`);
      }
      if (!remainingPropNames.delete(innerProp.propertyKey)) {
        throw new SchemaError("assertion failed");
      }
      const propVal = v[innerProp.propertyKey];
      obj[innerProp.propertyKey] = innerProp.checker(propVal,
        innerProp,
        path.concat([innerProp.propertyKey]));
    }

    if (!prop.extraAllowed && remainingPropNames.size !== 0) {
      const err = `superfluous properties ${JSON.stringify(Array.from(remainingPropNames.values()))} of ${typeName}`;
      throw new SchemaError(err);
    }
    return obj;
  }


  /**
   * Class with checkable annotations on fields.
   * This annotation adds the implementation of the `checked`
   * static method.
   */
  export function Class(opts: {extra?: boolean, validate?: boolean} = {}) {
    return (target: any) => {
      target.checked = (v: any) => {
        const cv = checkValue(v, {
          checker: checkValue,
          extraAllowed: !!opts.extra,
          propertyKey: "(root)",
          type: target,
        }, ["(root)"]);
        if (opts.validate) {
          if (typeof target.validate !== "function") {
            console.error("target", target);
            throw Error("invalid Checkable annotion: validate method required");
          }
          // May throw exception
          target.validate(cv);
        }
        return cv;
      };
      return target;
    };
  }


  /**
   * Target property must be a Checkable object of the given type.
   */
  export function Value(type: any) {
    if (!type) {
      throw Error("Type does not exist yet (wrong order of definitions?)");
    }
    function deco(target: object, propertyKey: string | symbol): void {
      const chk = getCheckableInfo(target);
      chk.props.push({
        checker: checkValue,
        propertyKey,
        type,
      });
    }

    return deco;
  }


  /**
   * List of values that match the given annotation.  For example, `@Checkable.List(Checkable.String)` is
   * an annotation for a list of strings.
   */
  export function List(type: any) {
    const stub = {};
    type(stub, "(list-element)");
    const elementProp = getCheckableInfo(stub).props[0];
    const elementChecker = elementProp.checker;
    if (!elementChecker) {
      throw Error("assertion failed");
    }
    function deco(target: object, propertyKey: string | symbol): void {
      const chk = getCheckableInfo(target);
      chk.props.push({
        checker: checkList,
        elementChecker,
        elementProp,
        propertyKey,
      });
    }

    return deco;
  }


  /**
   * Map from the key type to value type.  Takes two annotations,
   * one for the key type and one for the value type.
   */
  export function Map(keyType: any, valueType: any) {
    const keyStub = {};
    keyType(keyStub, "(map-key)");
    const keyProp = getCheckableInfo(keyStub).props[0];
    if (!keyProp) {
      throw Error("assertion failed");
    }
    const valueStub = {};
    valueType(valueStub, "(map-value)");
    const valueProp = getCheckableInfo(valueStub).props[0];
    if (!valueProp) {
      throw Error("assertion failed");
    }
    function deco(target: object, propertyKey: string | symbol): void {
      const chk = getCheckableInfo(target);
      chk.props.push({
        checker: checkMap,
        keyProp,
        propertyKey,
        valueProp,
      });
    }

    return deco;
  }


  /**
   * Makes another annotation optional, for example `@Checkable.Optional(Checkable.Number)`.
   */
  export function Optional(type: any) {
    const stub = {};
    type(stub, "(optional-element)");
    const elementProp = getCheckableInfo(stub).props[0];
    const elementChecker = elementProp.checker;
    if (!elementChecker) {
      throw Error("assertion failed");
    }
    function deco(target: object, propertyKey: string | symbol): void {
      const chk = getCheckableInfo(target);
      chk.props.push({
        checker: checkOptional,
        elementChecker,
        elementProp,
        optional: true,
        propertyKey,
      });
    }

    return deco;
  }


  /**
   * Target property must be a number.
   */
  export function Number(target: object, propertyKey: string | symbol): void {
    const chk = getCheckableInfo(target);
    chk.props.push({checker: checkNumber, propertyKey});
  }


  /**
   * Target property must be an arbitary object.
   */
  export function AnyObject(target: object, propertyKey: string | symbol): void {
    const chk = getCheckableInfo(target);
    chk.props.push({
      checker: checkAnyObject,
      propertyKey,
    });
  }


  /**
   * Target property can be anything.
   *
   * Not useful by itself, but in combination with higher-order annotations
   * such as List or Map.
   */
  export function Any(target: object, propertyKey: string | symbol): void {
    const chk = getCheckableInfo(target);
    chk.props.push({
      checker: checkAny,
      optional: true,
      propertyKey,
    });
  }


  /**
   * Target property must be a string.
   */
  export function String(target: object, propertyKey: string | symbol): void {
    const chk = getCheckableInfo(target);
    chk.props.push({ checker: checkString, propertyKey });
  }

  /**
   * Target property must be a boolean value.
   */
  export function Boolean(target: object, propertyKey: string | symbol): void {
    const chk = getCheckableInfo(target);
    chk.props.push({ checker: checkBoolean, propertyKey });
  }
}
