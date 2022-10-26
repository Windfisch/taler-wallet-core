/*
 This file is part of GNU Taler
 (C) 2021 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
 *
 * @author Sebastian Javier Marchano (sebasjm)
 */

import { h, VNode, Fragment } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import langIcon from "../../assets/icons/languageicon.svg";
import { useTranslationContext } from "../../context/translation";
import { strings as messages } from "../../i18n/strings";

type LangsNames = {
  [P in keyof typeof messages]: string;
};

const names: LangsNames = {
  es: "Español [es]",
  en: "English [en]",
  fr: "Français [fr]",
  de: "Deutsch [de]",
  sv: "Svenska [sv]",
  it: "Italiano [it]",
};

function getLangName(s: keyof LangsNames | string): string {
  if (names[s]) return names[s];
  return String(s);
}

// FIXME: explain "like py".
export function LangSelectorLikePy(): VNode {
  const [updatingLang, setUpdatingLang] = useState(false);
  const { lang, changeLanguage } = useTranslationContext();
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    function bodyKeyPress(event: KeyboardEvent) {
      if (event.code === "Escape") setHidden(true);
    }
    function bodyOnClick(event: Event) {
      setHidden(true);
    }
    document.body.addEventListener("click", bodyOnClick);
    document.body.addEventListener("keydown", bodyKeyPress as any);
    return () => {
      document.body.removeEventListener("keydown", bodyKeyPress as any);
      document.body.removeEventListener("click", bodyOnClick);
    };
  }, []);
  return (
    <Fragment>
      <button
        name="language"
        onClick={(ev) => {
          setHidden((h) => !h);
          ev.stopPropagation();
        }}
      >
        {getLangName(lang)}
      </button>
      <div id="lang" class={hidden ? "hide" : ""}>
        <div style="position: relative; overflow: visible;">
          <div
            class="nav"
            style="position: absolute; max-height: 60vh; overflow-y: scroll"
          >
            {Object.keys(messages)
              .filter((l) => l !== lang)
              .map((l) => (
                <a
                  key={l}
                  href="#"
                  class="navbtn langbtn"
                  value={l}
                  onClick={() => {
                    changeLanguage(l);
                    setUpdatingLang(false);
                  }}
                >
                  {getLangName(l)}
                </a>
              ))}
            <br />
          </div>
        </div>
      </div>
    </Fragment>
  );
}
