/*
 Copyright 2019 Florian Dold

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 or implied. See the License for the specific language governing
 permissions and limitations under the License.
*/

// @ts-ignore
import Typeson from "typeson";
// @ts-ignore
import structuredCloningThrowing from "typeson-registry/dist/presets/structured-cloning-throwing";

const TSON = new Typeson().register(structuredCloningThrowing);

export function structuredEncapsulate(val: any): any {
  return TSON.encapsulate(val);
}

export function structuredRevive(val: any): any {
  return TSON.revive(val);
}

/**
 * Structured clone for IndexedDB.
 */
export function structuredClone(val: any): any {
  return structuredRevive(structuredEncapsulate(val));
}
