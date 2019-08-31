/*
 This file is part of TALER
 (C) 2017 GNUnet e.V.

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
 * Page shown to the user to confirm creation
 * of a reserve, usually requested by the bank.
 *
 * @author Florian Dold
 */

import * as React from "react";
import * as ReactDOM from "react-dom";
import URI = require("urijs");

import * as i18n from "../../i18n";

import { acceptTip, getReserveCreationInfo, getTipStatus } from "../wxApi";

import { WithdrawDetailView, renderAmount, ProgressButton } from "../renderHtml";

import * as Amounts from "../../amounts";
import { useState, useEffect } from "react";
import { TipStatus } from "../../walletTypes";


function TipDisplay(props: { talerTipUri: string }) {
  const [tipStatus, setTipStatus] = useState<TipStatus | undefined>(undefined);
  const [discarded, setDiscarded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const doFetch = async () => {
      const ts = await getTipStatus(props.talerTipUri);
      setTipStatus(ts);
    };
    doFetch();
  }, []);

  if (discarded) {
    return <span>You've discarded the tip.</span>;
  }

  if (finished) {
    return <span>Tip has been accepted!</span>;
  }

  if (!tipStatus) {
    return <span>Loading ...</span>;
  }

  const discard = () => {
    setDiscarded(true);
  };

  const accept = async () => {
    setLoading(true);
    await acceptTip(props.talerTipUri);
    setFinished(true);
  };

  return (
    <div>
      <h2>Tip Received!</h2>
      <p>
        You received a tip of <strong>{renderAmount(tipStatus.amount)}</strong>{" "}
        from <span> </span>
        <strong>{tipStatus.merchantOrigin}</strong>.
      </p>
      <p>
        The tip is handled by the exchange{" "}
        <strong>{tipStatus.exchangeUrl}</strong>. This exchange will charge fees
        of <strong>{renderAmount(tipStatus.totalFees)}</strong> for this
        operation.
      </p>
      <form className="pure-form">
        <ProgressButton loading={loading} onClick={() => accept()}>
          AcceptTip
        </ProgressButton>
        {" "}
        <button className="pure-button" type="button" onClick={() => discard()}>
          Discard tip
        </button>
      </form>
    </div>
  );
}

async function main() {
  try {
    const url = new URI(document.location.href);
    const query: any = URI.parseQuery(url.query());
    const talerTipUri = query.talerTipUri;
    if (typeof talerTipUri !== "string") {
      throw Error("talerTipUri must be a string");
    }

    ReactDOM.render(
      <TipDisplay talerTipUri={talerTipUri} />,
      document.getElementById("container")!,
    );
  } catch (e) {
    // TODO: provide more context information, maybe factor it out into a
    // TODO:generic error reporting function or component.
    document.body.innerText = i18n.str`Fatal error: "${e.message}".`;
    console.error(`got error "${e.message}"`, e);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  main();
});
