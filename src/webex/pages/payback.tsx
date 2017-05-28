/*
 This file is part of TALER
 (C) 2017 Inria

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
 * View and edit auditors.
 *
 * @author Florian Dold
 */


import { amountToPretty, getTalerStampDate } from "../../helpers";
import {
  ExchangeRecord,
  ExchangeForCurrencyRecord,
  DenominationRecord,
  AuditorRecord,
  CurrencyRecord,
  ReserveRecord,
  CoinRecord,
  PreCoinRecord,
  Denomination,
  WalletBalance,
} from "../../types";

import { ImplicitStateComponent, StateHolder } from "../components";
import {
  getCurrencies,
  updateCurrency,
  getPaybackReserves,
  withdrawPaybackReserve,
} from "../wxApi";

import * as React from "react";
import * as ReactDOM from "react-dom";

class Payback extends ImplicitStateComponent<any> {
  reserves: StateHolder<ReserveRecord[]|null> = this.makeState(null);
  constructor() {
    super();
    let port = chrome.runtime.connect();
    port.onMessage.addListener((msg: any) => {
      if (msg.notify) {
        console.log("got notified");
        this.update();
      }
    });
    this.update();
  }

  async update() {
    let reserves = await getPaybackReserves();
    this.reserves(reserves);
  }

  withdrawPayback(pub: string) {
    withdrawPaybackReserve(pub); 
  }

  render(): JSX.Element {
    let reserves = this.reserves();
    if (!reserves) {
      return <span>loading ...</span>;
    }
    if (reserves.length == 0) {
      return <span>No reserves with payback available.</span>;
    }
    return (
      <div>
        {reserves.map(r => (
          <div>
            <h2>Reserve for ${amountToPretty(r.current_amount!)}</h2>
            <ul>
              <li>Exchange: ${r.exchange_base_url}</li>
            </ul>
            <button onClick={() => this.withdrawPayback(r.reserve_pub)}>Withdraw again</button>
          </div>
        ))}
      </div>
    );
  }
}

export function main() {
  ReactDOM.render(<Payback />, document.getElementById("container")!);
}

document.addEventListener("DOMContentLoaded", main);
