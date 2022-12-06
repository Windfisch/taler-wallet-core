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

/**
 *
 * @author Sebastian Javier Marchano (sebasjm)
 */

import { i18n, setupI18n } from "@gnu-taler/taler-util";
import { createContext, h, VNode } from "preact";
import { useContext, useEffect } from "preact/hooks";
import { useLang } from "../hooks/useLang.js";
import { strings } from "../i18n/strings.js";

interface Type {
  lang: string;
  supportedLang: { [id in keyof typeof supportedLang]: string };
  changeLanguage: (l: string) => void;
  i18n: typeof i18n;
  isSaved: boolean;
}

const supportedLang = {
  es: "Español [es]",
  ja: "日本語 [ja]",
  en: "English [en]",
  fr: "Français [fr]",
  de: "Deutsch [de]",
  sv: "Svenska [sv]",
  it: "Italiano [it]",
  // ko: "한국어 [ko]",
  // ru: "Ру́сский язы́к [ru]",
  tr: "Türk [tr]",
  navigator: "Defined by navigator",
};

const initial = {
  lang: "en",
  supportedLang,
  changeLanguage: () => {
    // do not change anything
  },
  i18n,
  isSaved: false,
};
const Context = createContext<Type>(initial);

interface Props {
  initial?: string;
  children: any;
  forceLang?: string;
}

export const TranslationProvider = ({
  initial,
  children,
  forceLang,
}: Props): VNode => {
  const [lang, changeLanguage, isSaved] = useLang(initial);
  useEffect(() => {
    if (forceLang) {
      changeLanguage(forceLang);
    }
  });
  useEffect(() => {
    setupI18n(lang, strings);
  }, [lang]);
  if (forceLang) {
    setupI18n(forceLang, strings);
  } else {
    setupI18n(lang, strings);
  }

  return h(Context.Provider, {
    value: { lang, changeLanguage, supportedLang, i18n, isSaved },
    children,
  });
};

export const useTranslationContext = (): Type => useContext(Context);
