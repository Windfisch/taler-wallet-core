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

import { h, VNode } from "preact";
import { useEffect } from "preact/hooks";
import { QR } from "../../components/QR.js";
import { useTranslationContext } from "../../context/translation.js";

export function QrCodeSection({
  talerWithdrawUri,
  abortButton,
}: {
  talerWithdrawUri: string;
  abortButton: h.JSX.Element;
}): VNode {
  const { i18n } = useTranslationContext();
  useEffect(() => {
    //Taler Wallet WebExtension is listening to headers response and tab updates.
    //In the SPA there is no header response with the Taler URI so
    //this hack manually triggers the tab update after the QR is in the DOM.
    window.location.hash = `/account/${new Date().getTime()}`;
  }, []);

  return (
    <section id="main" class="content">
      <h1 class="nav">{i18n.str`Transfer to Taler Wallet`}</h1>
      <article>
        <div class="qr-div">
          <p>{i18n.str`Use this QR code to withdraw to your mobile wallet:`}</p>
          {QR({ text: talerWithdrawUri })}
          <p>
            Click{" "}
            <a id="linkqr" href={talerWithdrawUri}>{i18n.str`this link`}</a> to
            open your Taler wallet!
          </p>
          <br />
          {abortButton}
        </div>
      </article>
    </section>
  );
}
