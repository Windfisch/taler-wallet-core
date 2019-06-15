/*
 * Copyright 2017 Jeremy Scheff
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

import { FakeDOMStringList } from "./types";

// Would be nicer to sublcass Array, but I'd have to sacrifice Node 4 support to do that.

const fakeDOMStringList = (arr: string[]): FakeDOMStringList => {
  const arr2 = arr.slice();

  Object.defineProperty(arr2, "contains", {
    // tslint:disable-next-line object-literal-shorthand
    value: (value: string) => arr2.indexOf(value) >= 0,
  });

  Object.defineProperty(arr2, "item", {
    // tslint:disable-next-line object-literal-shorthand
    value: (i: number) => arr2[i],
  });

  return arr2 as FakeDOMStringList;
};

export default fakeDOMStringList;
