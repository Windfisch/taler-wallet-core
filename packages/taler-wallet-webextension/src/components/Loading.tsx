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
import { Fragment, h, VNode } from "preact";
import { useEffect, useState } from "preact/hooks";
import { useTranslationContext } from "../context/translation.js";
import { CenteredText } from "./styled/index.js";

export function Loading(): VNode {
  const { i18n } = useTranslationContext();
  const [tooLong, setTooLong] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => {
      setTooLong(true);
    }, 500);
    return () => {
      clearTimeout(id);
    };
  });
  if (tooLong) {
    return (
      <section style={{ margin: "auto" }}>
        <CenteredText>
          <i18n.Translate>Loading</i18n.Translate>...
        </CenteredText>
      </section>
    );
  }
  return <Fragment />;
}
