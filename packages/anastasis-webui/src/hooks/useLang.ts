/*
 This file is part of GNU Anastasis
 (C) 2021-2022 Anastasis SARL

 GNU Anastasis is free software; you can redistribute it and/or modify it under the
 terms of the GNU Affero General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Anastasis is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License along with
 GNU Anastasis; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import { useNotNullLocalStorage } from "./useLocalStorage.js";

function getBrowserLang(): string | undefined {
  if (window.navigator.languages) return window.navigator.languages[0];
  if (window.navigator.language) return window.navigator.language;
  return undefined;
}

export function useLang(
  initial?: string,
): [string, (s: string) => void, boolean] {
  const defaultLang = (getBrowserLang() || initial || "en").substring(0, 2);
  return useNotNullLocalStorage("lang-preference", defaultLang);
}
