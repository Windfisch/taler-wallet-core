/*
 This file is part of GNU Taler
 (C) 2022 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import { Logger } from "@gnu-taler/taler-util";

type HttpMethod =
  | "get"
  | "GET"
  | "delete"
  | "DELETE"
  | "head"
  | "HEAD"
  | "options"
  | "OPTIONS"
  | "post"
  | "POST"
  | "put"
  | "PUT"
  | "patch"
  | "PATCH"
  | "purge"
  | "PURGE"
  | "link"
  | "LINK"
  | "unlink"
  | "UNLINK";

export type Query<Req, Res> = {
  method: HttpMethod;
  url: string;
  code?: number;
};

type ExpectationValues = {
  query: Query<any, any>;
  auth?: string;
  params?: {
    request?: object;
    qparam?: Record<string, string>;
    response?: object;
  };
};

type TestValues = {
  currentExpectedQuery: ExpectationValues | undefined;
  lastQuery: ExpectationValues | undefined;
};

const logger = new Logger("testing/swr.ts");

export abstract class MockEnvironment {
  expectations: Array<ExpectationValues> = [];
  queriesMade: Array<ExpectationValues> = [];
  index = 0;

  debug: boolean;
  constructor(debug: boolean) {
    this.debug = debug;
    this.registerRequest.bind(this);
  }

  public addRequestExpectation<
    RequestType extends object,
    ResponseType extends object,
  >(
    query: Query<RequestType, ResponseType>,
    params: {
      auth?: string;
      request?: RequestType;
      qparam?: any;
      response?: ResponseType;
    },
  ): void {
    const expected = { query, params, auth: params.auth };
    this.expectations.push(expected);
    if (this.debug) {
      logger.info("saving query as expected", expected);
    }
    this.mockApiIfNeeded();
  }

  abstract mockApiIfNeeded(): void;

  public registerRequest<
    RequestType extends object,
    ResponseType extends object,
  >(
    query: Query<RequestType, ResponseType>,
    params: {
      auth?: string;
      request?: RequestType;
      qparam?: any;
      response?: ResponseType;
    },
  ): { status: number; payload: ResponseType } | undefined {
    const queryMade = { query, params, auth: params.auth };
    this.queriesMade.push(queryMade);
    const expectedQuery = this.expectations[this.index];
    if (!expectedQuery) {
      if (this.debug) {
        logger.info("unexpected query made", queryMade);
      }
      return undefined;
    }
    const responseCode = this.expectations[this.index].query.code ?? 200;
    const mockedResponse = this.expectations[this.index].params
      ?.response as ResponseType;
    if (this.debug) {
      logger.info("tracking query made", {
        queryMade,
        expectedQuery,
      });
    }
    this.index++;
    return { status: responseCode, payload: mockedResponse };
  }

  public assertJustExpectedRequestWereMade(): AssertStatus {
    let queryNumber = 0;

    while (queryNumber < this.expectations.length) {
      const r = this.assertNextRequest(queryNumber);
      if (r.result !== "ok") return r;
      queryNumber++;
    }
    return this.assertNoMoreRequestWereMade(queryNumber);
  }

  private getLastTestValues(idx: number): TestValues {
    const currentExpectedQuery = this.expectations[idx];
    const lastQuery = this.queriesMade[idx];

    return { currentExpectedQuery, lastQuery };
  }

  private assertNoMoreRequestWereMade(idx: number): AssertStatus {
    const { currentExpectedQuery, lastQuery } = this.getLastTestValues(idx);

    if (lastQuery !== undefined) {
      return {
        result: "error-did-one-more",
        made: lastQuery,
      };
    }
    if (currentExpectedQuery !== undefined) {
      return {
        result: "error-did-one-less",
        expected: currentExpectedQuery,
      };
    }

    return {
      result: "ok",
    };
  }

  private assertNextRequest(idx: number): AssertStatus {
    const { currentExpectedQuery, lastQuery } = this.getLastTestValues(idx);

    if (!currentExpectedQuery) {
      return {
        result: "error-query-missing",
      };
    }

    if (!lastQuery) {
      return {
        result: "error-did-one-less",
        expected: currentExpectedQuery,
      };
    }

    if (lastQuery.query.method) {
      if (currentExpectedQuery.query.method !== lastQuery.query.method) {
        return {
          result: "error-difference",
          diff: "method",
        };
      }
      if (currentExpectedQuery.query.url !== lastQuery.query.url) {
        return {
          result: "error-difference",
          diff: "url",
        };
      }
    }
    if (
      !deepEquals(
        currentExpectedQuery.params?.request,
        lastQuery.params?.request,
      )
    ) {
      return {
        result: "error-difference",
        diff: "query-body",
      };
    }
    if (
      !deepEquals(currentExpectedQuery.params?.qparam, lastQuery.params?.qparam)
    ) {
      return {
        result: "error-difference",
        diff: "query-params",
      };
    }
    if (!deepEquals(currentExpectedQuery.auth, lastQuery.auth)) {
      return {
        result: "error-difference",
        diff: "query-auth",
      };
    }

    return {
      result: "ok",
    };
  }
}

type AssertStatus =
  | AssertOk
  | AssertQueryNotMadeButExpected
  | AssertQueryMadeButNotExpected
  | AssertQueryMissing
  | AssertExpectedQueryMethodMismatch
  | AssertExpectedQueryUrlMismatch
  | AssertExpectedQueryAuthMismatch
  | AssertExpectedQueryBodyMismatch
  | AssertExpectedQueryParamsMismatch;

interface AssertOk {
  result: "ok";
}

//trying to assert for a expected query but there is
//no expected query in the queue
interface AssertQueryMissing {
  result: "error-query-missing";
}

//tested component did one more query that expected
interface AssertQueryNotMadeButExpected {
  result: "error-did-one-more";
  made: ExpectationValues;
}

//tested component didn't make an expected query
interface AssertQueryMadeButNotExpected {
  result: "error-did-one-less";
  expected: ExpectationValues;
}

interface AssertExpectedQueryMethodMismatch {
  result: "error-difference";
  diff: "method";
}
interface AssertExpectedQueryUrlMismatch {
  result: "error-difference";
  diff: "url";
}
interface AssertExpectedQueryAuthMismatch {
  result: "error-difference";
  diff: "query-auth";
}
interface AssertExpectedQueryBodyMismatch {
  result: "error-difference";
  diff: "query-body";
}
interface AssertExpectedQueryParamsMismatch {
  result: "error-difference";
  diff: "query-params";
}

/**
 * helpers
 *
 */
export type Tester = (a: any, b: any) => boolean | undefined;

function deepEquals(
  a: unknown,
  b: unknown,
  aStack: Array<unknown> = [],
  bStack: Array<unknown> = [],
): boolean {
  //one if the element is null or undefined
  if (a === null || b === null || b === undefined || a === undefined) {
    return a === b;
  }
  //both are errors
  if (a instanceof Error && b instanceof Error) {
    return a.message == b.message;
  }
  //is the same object
  if (Object.is(a, b)) {
    return true;
  }
  //both the same class
  const name = Object.prototype.toString.call(a);
  if (name != Object.prototype.toString.call(b)) {
    return false;
  }
  //
  switch (name) {
    case "[object Boolean]":
    case "[object String]":
    case "[object Number]":
      if (typeof a !== typeof b) {
        // One is a primitive, one a `new Primitive()`
        return false;
      } else if (typeof a !== "object" && typeof b !== "object") {
        // both are proper primitives
        return Object.is(a, b);
      } else {
        // both are `new Primitive()`s
        return Object.is(a.valueOf(), b.valueOf());
      }
    case "[object Date]": {
      const _a = a as Date;
      const _b = b as Date;
      return _a == _b;
    }
    case "[object RegExp]": {
      const _a = a as RegExp;
      const _b = b as RegExp;
      return _a.source === _b.source && _a.flags === _b.flags;
    }
    case "[object Array]": {
      const _a = a as Array<any>;
      const _b = b as Array<any>;
      if (_a.length !== _b.length) {
        return false;
      }
    }
  }
  if (typeof a !== "object" || typeof b !== "object") {
    return false;
  }

  if (
    typeof a === "object" &&
    typeof b === "object" &&
    !Array.isArray(a) &&
    !Array.isArray(b) &&
    hasIterator(a) &&
    hasIterator(b)
  ) {
    return iterable(a, b);
  }

  // Used to detect circular references.
  let length = aStack.length;
  while (length--) {
    if (aStack[length] === a) {
      return bStack[length] === b;
    } else if (bStack[length] === b) {
      return false;
    }
  }
  aStack.push(a);
  bStack.push(b);

  const aKeys = allKeysFromObject(a);
  const bKeys = allKeysFromObject(b);
  let keySize = aKeys.length;

  //same number of keys
  if (bKeys.length !== keySize) {
    return false;
  }

  let keyIterator: string;
  while (keySize--) {
    const _a = a as Record<string, object>;
    const _b = b as Record<string, object>;

    keyIterator = aKeys[keySize];

    const de = deepEquals(_a[keyIterator], _b[keyIterator], aStack, bStack);
    if (!de) {
      return false;
    }
  }

  aStack.pop();
  bStack.pop();

  return true;
}

function allKeysFromObject(obj: object): Array<string> {
  const keys = [];
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      keys.push(key);
    }
  }
  return keys;
}

const IteratorSymbol = Symbol.iterator;

function hasIterator(object: any): boolean {
  return !!(object != null && object[IteratorSymbol]);
}

function iterable(
  a: unknown,
  b: unknown,
  aStack: Array<unknown> = [],
  bStack: Array<unknown> = [],
): boolean {
  if (a === null || b === null || b === undefined || a === undefined) {
    return a === b;
  }
  if (a.constructor !== b.constructor) {
    return false;
  }
  let length = aStack.length;
  while (length--) {
    if (aStack[length] === a) {
      return bStack[length] === b;
    }
  }
  aStack.push(a);
  bStack.push(b);

  const aIterator = (a as any)[IteratorSymbol]();
  const bIterator = (b as any)[IteratorSymbol]();

  const nextA = aIterator.next();
  while (nextA.done) {
    const nextB = bIterator.next();
    if (nextB.done || !deepEquals(nextA.value, nextB.value)) {
      return false;
    }
  }
  if (!bIterator.next().done) {
    return false;
  }

  // Remove the first value from the stack of traversed values.
  aStack.pop();
  bStack.pop();
  return true;
}
