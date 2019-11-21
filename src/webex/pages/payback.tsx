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

/**
 * Imports.
 */
import { ReserveRecord } from "../../dbTypes";
import { renderAmount, registerMountPage } from "../renderHtml";
import { getPaybackReserves, withdrawPaybackReserve } from "../wxApi";
import * as React from "react";
import { useState } from "react";

function Payback() {
  const [reserves, setReserves] = useState<ReserveRecord[] | null>(null);

  useState(() => {
    const update = async () => {
      const r = await getPaybackReserves();
      setReserves(r);
    };

    const port = chrome.runtime.connect();
    port.onMessage.addListener((msg: any) => {
      if (msg.notify) {
        console.log("got notified");
        update();
      }
    });
  });

  if (!reserves) {
    return <span>loading ...</span>;
  }
  if (reserves.length === 0) {
    return <span>No reserves with payback available.</span>;
  }
  return (
    <div>
      {reserves.map(r => (
        <div>
          <h2>Reserve for ${renderAmount(r.currentAmount!)}</h2>
          <ul>
            <li>Exchange: ${r.exchangeBaseUrl}</li>
          </ul>
          <button onClick={() => withdrawPaybackReserve(r.reservePub)}>
            Withdraw again
          </button>
        </div>
      ))}
    </div>
  );
}

registerMountPage(() => <Payback />);
