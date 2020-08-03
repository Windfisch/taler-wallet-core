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

/**
 * Translation helpers for React components and template literals.
 */

/**
 * Imports.
 */
import { strings } from "./strings";
export { strings } from "./strings";

// @ts-ignore: no type decl for this library
import * as jedLib from "jed";

export let jed: any = undefined;

/**
 * Set up jed library for internationalization,
 * based on browser language settings.
 */
export function setupI18n(lang: string): any {
  lang = lang.replace("_", "-");

  if (!strings[lang]) {
    lang = "en-US";
    console.log(`language ${lang} not found, defaulting to english`);
  }
  jed = new jedLib.Jed(strings[lang]);
}

/**
 * Use different translations for testing.  Should not be used outside
 * of test cases.
 */
export function internalSetStrings(langStrings: any): void {
  jed = new jedLib.Jed(langStrings);
}

/**
 * Convert template strings to a msgid
 */
function toI18nString(stringSeq: ReadonlyArray<string>): string {
  let s = "";
  for (let i = 0; i < stringSeq.length; i++) {
    s += stringSeq[i];
    if (i < stringSeq.length - 1) {
      s += `%${i + 1}$s`;
    }
  }
  return s;
}

/**
 * Internationalize a string template with arbitrary serialized values.
 */
export function str(stringSeq: TemplateStringsArray, ...values: any[]): string {
  const s = toI18nString(stringSeq);
  const tr = jed
    .translate(s)
    .ifPlural(1, s)
    .fetch(...values);
  return tr;
}
