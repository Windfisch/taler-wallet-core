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
import { useState } from "preact/hooks";
import { useTranslationContext } from "@gnu-taler/web-util/lib/index.browser";
import { PaytoWireTransferForm } from "./PaytoWireTransferForm.js";
import { WalletWithdrawForm } from "./WalletWithdrawForm.js";

/**
 * Let the user choose a payment option,
 * then specify the details trigger the action.
 */
export function PaymentOptions({ currency }: { currency?: string }): VNode {
  const { i18n } = useTranslationContext();

  const [tab, setTab] = useState<"charge-wallet" | "wire-transfer">(
    "charge-wallet",
  );

  return (
    <article>
      <div class="payments">
        <div class="tab">
          <button
            class={tab === "charge-wallet" ? "tablinks active" : "tablinks"}
            onClick={(): void => {
              setTab("charge-wallet");
            }}
          >
            {i18n.str`Obtain digital cash`}
          </button>
          <button
            class={tab === "wire-transfer" ? "tablinks active" : "tablinks"}
            onClick={(): void => {
              setTab("wire-transfer");
            }}
          >
            {i18n.str`Transfer to bank account`}
          </button>
        </div>
        {tab === "charge-wallet" && (
          <div id="charge-wallet" class="tabcontent active">
            <h3>{i18n.str`Obtain digital cash`}</h3>
            <WalletWithdrawForm focus currency={currency} />
          </div>
        )}
        {tab === "wire-transfer" && (
          <div id="wire-transfer" class="tabcontent active">
            <h3>{i18n.str`Transfer to bank account`}</h3>
            <PaytoWireTransferForm focus currency={currency} />
          </div>
        )}
      </div>
    </article>
  );
}
