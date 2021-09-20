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
  amountFractionalBase, Amounts,
  Balance, BalancesResponse,
  i18n
} from "@gnu-taler/taler-util";
import { JSX } from "preact";
import { ButtonPrimary, Centered, WalletBox } from "../components/styled/index";
import { BalancesHook, useBalances } from "../hooks/useBalances";
import { PageLink, renderAmount } from "../renderHtml";


export function BalancePage({ goToWalletManualWithdraw }: { goToWalletManualWithdraw: () => void }) {
  const balance = useBalances()
  return <BalanceView balance={balance} Linker={PageLink} goToWalletManualWithdraw={goToWalletManualWithdraw} />
}

export interface BalanceViewProps {
  balance: BalancesHook;
  Linker: typeof PageLink;
  goToWalletManualWithdraw: () => void;
}

export function BalanceView({ balance, Linker, goToWalletManualWithdraw }: BalanceViewProps) {
  if (!balance) {
    return <span />
  }

  if (balance.error) {
    return (
      <div>
        <p>{i18n.str`Error: could not retrieve balance information.`}</p>
        <p>
          Click <Linker pageName="welcome">here</Linker> for help and
          diagnostics.
        </p>
      </div>
    )
  }
  if (balance.response.balances.length === 0) {
    return (
      <p><i18n.Translate>
        You have no balance to show. Need some{" "}
        <Linker pageName="/welcome">help</Linker> getting started?
      </i18n.Translate></p>
    )
  }
  return <ShowBalances wallet={balance.response}
    onWithdraw={goToWalletManualWithdraw}
  />
}

function formatPending(entry: Balance): JSX.Element {
  let incoming: JSX.Element | undefined;
  let payment: JSX.Element | undefined;

  const available = Amounts.parseOrThrow(entry.available);
  const pendingIncoming = Amounts.parseOrThrow(entry.pendingIncoming);
  const pendingOutgoing = Amounts.parseOrThrow(entry.pendingOutgoing);

  if (!Amounts.isZero(pendingIncoming)) {
    incoming = (
      <span><i18n.Translate>
        <span style={{ color: "darkgreen" }}>
          {"+"}
          {renderAmount(entry.pendingIncoming)}
        </span>{" "}
        incoming
      </i18n.Translate></span>
    );
  }

  const l = [incoming, payment].filter((x) => x !== undefined);
  if (l.length === 0) {
    return <span />;
  }

  if (l.length === 1) {
    return <span>({l})</span>;
  }
  return (
    <span>
      ({l[0]}, {l[1]})
    </span>
  );
}


function ShowBalances({ wallet, onWithdraw }: { wallet: BalancesResponse, onWithdraw: () => void }) {
  return <WalletBox>
    <section>
      <Centered>{wallet.balances.map((entry) => {
        const av = Amounts.parseOrThrow(entry.available);
        const v = av.value + av.fraction / amountFractionalBase;
        return (
          <p key={av.currency}>
            <span>
              <span style={{ fontSize: "5em", display: "block" }}>{v}</span>{" "}
              <span>{av.currency}</span>
            </span>
            {formatPending(entry)}
          </p>
        );
      })}</Centered>
    </section>
    <footer>
      <div />
      <ButtonPrimary onClick={onWithdraw} >Withdraw</ButtonPrimary>
    </footer>
  </WalletBox>
}
