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

import { acceptTip, getTipStatus } from "../wxApi";

import { renderAmount, ProgressButton } from "../renderHtml";

import { useState, useEffect } from "react";
import { walletTypes } from "taler-wallet-core";

function TipDisplay(props: { talerTipUri: string }): JSX.Element {
  const [tipStatus, setTipStatus] = useState<walletTypes.TipStatus | undefined>(undefined);
  const [discarded, setDiscarded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const doFetch = async (): Promise<void> => {
      const ts = await getTipStatus(props.talerTipUri);
      setTipStatus(ts);
    };
    doFetch();
  }, [props.talerTipUri]);

  if (discarded) {
    return <span>You&apos;ve discarded the tip.</span>;
  }

  if (finished) {
    return <span>Tip has been accepted!</span>;
  }

  if (!tipStatus) {
    return <span>Loading ...</span>;
  }

  const discard = (): void => {
    setDiscarded(true);
  };

  const accept = async (): Promise<void> => {
    setLoading(true);
    await acceptTip(tipStatus.tipId);
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
          Accept Tip
        </ProgressButton>{" "}
        <button className="pure-button" type="button" onClick={() => discard()}>
          Discard tip
        </button>
      </form>
    </div>
  );
}

export function createTipPage(): JSX.Element {
  const url = new URL(document.location.href);
  const talerTipUri = url.searchParams.get("talerTipUri");
  if (typeof talerTipUri !== "string") {
    throw Error("talerTipUri must be a string");
  }

  return <TipDisplay talerTipUri={talerTipUri} />;
}
