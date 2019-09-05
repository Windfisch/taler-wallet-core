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

import { CurrencyRecord } from "../../dbTypes";
import { getCurrencies, updateCurrency } from "../wxApi";
import React, { useState } from "react";
import URI = require("urijs");
import { registerMountPage } from "../renderHtml";

interface ConfirmAuditorProps {
  url: string;
  currency: string;
  auditorPub: string;
  expirationStamp: number;
}

function ConfirmAuditor(props: ConfirmAuditorProps) {
  const [addDone, setAddDone] = useState(false);


  const add = async() => {
    const currencies = await getCurrencies();
    let currency: CurrencyRecord | undefined;

    for (const c of currencies) {
      if (c.name === props.currency) {
        currency = c;
      }
    }

    if (!currency) {
      currency = {
        name: props.currency,
        auditors: [],
        fractionalDigits: 2,
        exchanges: [],
      };
    }

    const newAuditor = {
      auditorPub: props.auditorPub,
      baseUrl: props.url,
      expirationStamp: props.expirationStamp,
    };

    let auditorFound = false;
    for (const idx in currency.auditors) {
      const a = currency.auditors[idx];
      if (a.baseUrl === props.url) {
        auditorFound = true;
        // Update auditor if already found by URL.
        currency.auditors[idx] = newAuditor;
      }
    }

    if (!auditorFound) {
      currency.auditors.push(newAuditor);
    }

    await updateCurrency(currency);

    setAddDone(true);
  }

  const back = () => {
    window.history.back();
  };

  return (
    <div id="main">
      <p>
        Do you want to let <strong>{props.auditorPub}</strong> audit the
        currency "{props.currency}"?
      </p>
      {addDone ? (
        <div>
          Auditor was added! You can also{" "}
          <a href={chrome.extension.getURL("/src/webex/pages/auditors.html")}>
            view and edit
          </a>{" "}
          auditors.
        </div>
      ) : (
        <div>
          <button
            onClick={() => add()}
            className="pure-button pure-button-primary"
          >
            Yes
          </button>
          <button onClick={() => back()} className="pure-button">
            No
          </button>
        </div>
      )}
    </div>
  );
}


registerMountPage(() => {
  const walletPageUrl = new URI(document.location.href);
  const query: any = JSON.parse(
    (URI.parseQuery(walletPageUrl.query()) as any).req,
  );
  const url = query.url;
  const currency: string = query.currency;
  const auditorPub: string = query.auditorPub;
  const expirationStamp = Number.parseInt(query.expirationStamp);
  const args = { url, currency, auditorPub, expirationStamp };
  return <ConfirmAuditor {...args}/>;
});
