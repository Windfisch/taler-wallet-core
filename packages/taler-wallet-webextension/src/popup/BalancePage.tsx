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

import {
  amountFractionalBase,
  Amounts,
  Balance,
  i18n,
} from "@gnu-taler/taler-util";
import { h, VNode } from "preact";
import {
  ButtonPrimary,
  ErrorBox,
  Middle,
  PopupBox,
} from "../components/styled/index";
import { BalancesHook, useBalances } from "../hooks/useBalances";
import { PageLink, renderAmount } from "../renderHtml";

export function BalancePage({
  goToWalletManualWithdraw,
}: {
  goToWalletManualWithdraw: () => void;
}): VNode {
  const balance = useBalances();
  return (
    <BalanceView
      balance={balance}
      Linker={PageLink}
      goToWalletManualWithdraw={goToWalletManualWithdraw}
    />
  );
}
export interface BalanceViewProps {
  balance: BalancesHook;
  Linker: typeof PageLink;
  goToWalletManualWithdraw: () => void;
}

function formatPending(entry: Balance): VNode {
  let incoming: VNode | undefined;
  let payment: VNode | undefined;

  // const available = Amounts.parseOrThrow(entry.available);
  const pendingIncoming = Amounts.parseOrThrow(entry.pendingIncoming);
  const pendingOutgoing = Amounts.parseOrThrow(entry.pendingOutgoing);

  if (!Amounts.isZero(pendingIncoming)) {
    incoming = (
      <span>
        <i18n.Translate>
          <span style={{ color: "darkgreen" }} title="incoming amount">
            {"+"}
            {renderAmount(entry.pendingIncoming)}
          </span>{" "}
        </i18n.Translate>
      </span>
    );
  }
  if (!Amounts.isZero(pendingOutgoing)) {
    payment = (
      <span>
        <i18n.Translate>
          <span style={{ color: "darkred" }} title="outgoing amount">
            {"-"}
            {renderAmount(entry.pendingOutgoing)}
          </span>{" "}
        </i18n.Translate>
      </span>
    );
  }

  const l = [incoming, payment].filter((x) => x !== undefined);
  if (l.length === 0) {
    return <span />;
  }

  if (l.length === 1) {
    return <span>{l}</span>;
  }
  return (
    <span>
      {l[0]}, {l[1]}
    </span>
  );
}

export function BalanceView({
  balance,
  Linker,
  goToWalletManualWithdraw,
}: BalanceViewProps): VNode {
  function Content(): VNode {
    if (!balance) {
      return <span />;
    }

    if (balance.hasError) {
      return (
        <section>
          <ErrorBox>{balance.message}</ErrorBox>
          <p>
            Click <Linker pageName="welcome">here</Linker> for help and
            diagnostics.
          </p>
        </section>
      );
    }
    if (balance.response.balances.length === 0) {
      return (
        <section data-expanded>
          <Middle>
            <p>
              <i18n.Translate>
                You have no balance to show. Need some{" "}
                <Linker pageName="/welcome">help</Linker> getting started?
              </i18n.Translate>
            </p>
          </Middle>
        </section>
      );
    }
    return (
      <section data-expanded data-centered>
        <table style={{ width: "100%" }}>
          {balance.response.balances.map((entry, idx) => {
            const av = Amounts.parseOrThrow(entry.available);
            // Create our number formatter.
            let formatter;
            try {
              formatter = new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: av.currency,
                currencyDisplay: "symbol",
                // These options are needed to round to whole numbers if that's what you want.
                //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
                //maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
              });
            } catch {
              formatter = new Intl.NumberFormat("en-US", {
                // style: 'currency',
                // currency: av.currency,
                // These options are needed to round to whole numbers if that's what you want.
                //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
                //maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
              });
            }

            const v = formatter.format(
              av.value + av.fraction / amountFractionalBase,
            );
            const fontSize =
              v.length < 8 ? "3em" : v.length < 13 ? "2em" : "1em";
            return (
              <tr key={idx}>
                <td
                  style={{
                    height: 50,
                    fontSize,
                    width: "60%",
                    textAlign: "right",
                    padding: 0,
                  }}
                >
                  {v}
                </td>
                <td style={{ maxWidth: "2em", overflowX: "hidden" }}>
                  {av.currency}
                </td>
                <td style={{ fontSize: "small", color: "gray" }}>
                  {formatPending(entry)}
                </td>
              </tr>
            );
          })}
        </table>
      </section>
    );
  }

  return (
    <PopupBox>
      {/* <section> */}
      <Content />
      {/* </section> */}
      <footer>
        <div />
        <ButtonPrimary onClick={goToWalletManualWithdraw}>
          Withdraw
        </ButtonPrimary>
      </footer>
    </PopupBox>
  );
}
