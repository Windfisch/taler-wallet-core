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
  Amounts,
  BalancesResponse,
  Balance, i18n, AmountJson, amountFractionalBase
} from "@gnu-taler/taler-util";
import { Component, JSX } from "preact";
import { PageLink, renderAmount } from "../renderHtml";
import * as wxApi from "../wxApi";


/**
 * Render an amount as a large number with a small currency symbol.
 */
function bigAmount(amount: AmountJson): JSX.Element {
  const v = amount.value + amount.fraction / amountFractionalBase;
  return (
    <span>
      <span style={{ fontSize: "5em", display: "block" }}>{v}</span>{" "}
      <span>{amount.currency}</span>
    </span>
  );
}

function EmptyBalanceView(): JSX.Element {
  return (
    <p><i18n.Translate>
      You have no balance to show. Need some{" "}
      <PageLink pageName="/welcome">help</PageLink> getting started?
    </i18n.Translate></p>
  );
}


export class BalancePage extends Component<any, any> {
  private balance?: BalancesResponse;
  private gotError = false;
  private canceler: (() => void) | undefined = undefined;
  private unmount = false;
  private updateBalanceRunning = false;

  componentWillMount(): void {
    this.canceler = wxApi.onUpdateNotification(() => this.updateBalance());
    this.updateBalance();
  }

  componentWillUnmount(): void {
    console.log("component WalletBalanceView will unmount");
    if (this.canceler) {
      this.canceler();
    }
    this.unmount = true;
  }

  async updateBalance(): Promise<void> {
    if (this.updateBalanceRunning) {
      return;
    }
    this.updateBalanceRunning = true;
    let balance: BalancesResponse;
    try {
      balance = await wxApi.getBalance();
    } catch (e) {
      if (this.unmount) {
        return;
      }
      this.gotError = true;
      console.error("could not retrieve balances", e);
      this.setState({});
      return;
    } finally {
      this.updateBalanceRunning = false;
    }
    if (this.unmount) {
      return;
    }
    this.gotError = false;
    console.log("got balance", balance);
    this.balance = balance;
    this.setState({});
  }

  formatPending(entry: Balance): JSX.Element {
    let incoming: JSX.Element | undefined;
    let payment: JSX.Element | undefined;

    const available = Amounts.parseOrThrow(entry.available);
    const pendingIncoming = Amounts.parseOrThrow(entry.pendingIncoming);
    const pendingOutgoing = Amounts.parseOrThrow(entry.pendingOutgoing);

    console.log(
      "available: ",
      entry.pendingIncoming ? renderAmount(entry.available) : null
    );
    console.log(
      "incoming: ",
      entry.pendingIncoming ? renderAmount(entry.pendingIncoming) : null
    );

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

  render(): JSX.Element {
    const wallet = this.balance;
    if (this.gotError) {
      return (
        <div class="balance">
          <p>{i18n.str`Error: could not retrieve balance information.`}</p>
          <p>
            Click <PageLink pageName="welcome.html">here</PageLink> for help and
            diagnostics.
          </p>
        </div>
      );
    }
    if (!wallet) {
      return <span></span>;
    }

    const listing = wallet.balances.map((entry) => {
      const av = Amounts.parseOrThrow(entry.available);
      return (
        <p key={av.currency}>
          {bigAmount(av)} {this.formatPending(entry)}
        </p>
      );
    });
    return listing.length > 0 ? (
      <div class="balance">{listing}</div>
    ) : (
      <EmptyBalanceView />
    );
  }
}
