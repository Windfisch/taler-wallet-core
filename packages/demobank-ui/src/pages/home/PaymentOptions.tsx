import { h, VNode } from "preact";
import { useState } from "preact/hooks";
import { useTranslationContext } from "../../context/translation.js";
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
