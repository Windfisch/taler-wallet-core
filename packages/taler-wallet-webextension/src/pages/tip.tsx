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
 * Page shown to the user to accept or ignore a tip from a merchant.
 *
 * @author Florian Dold <dold@taler.net>
 */

import { useEffect, useState } from "preact/hooks";
import { PrepareTipResult } from "@gnu-taler/taler-util";
import { AmountView } from "../renderHtml";
import * as wxApi from "../wxApi";
import { JSX } from "preact/jsx-runtime";

function TalerTipDialog({ talerTipUri }: { talerTipUri: string }): JSX.Element {
  const [updateCounter, setUpdateCounter] = useState<number>(0);
  const [prepareTipResult, setPrepareTipResult] = useState<
    PrepareTipResult | undefined
  >(undefined);

  const [tipIgnored, setTipIgnored] = useState(false);

  useEffect(() => {
    const doFetch = async (): Promise<void> => {
      const p = await wxApi.prepareTip({ talerTipUri });
      setPrepareTipResult(p);
    };
    doFetch();
  }, [talerTipUri, updateCounter]);

  const doAccept = async () => {
    if (!prepareTipResult) {
      return;
    }
    await wxApi.acceptTip({ walletTipId: prepareTipResult?.walletTipId });
    setUpdateCounter(updateCounter + 1);
  };

  const doIgnore = () => {
    setTipIgnored(true);
  };

  if (tipIgnored) {
    return <span>You've ignored the tip.</span>;
  }

  if (!prepareTipResult) {
    return <span>Loading ...</span>;
  }

  if (prepareTipResult.accepted) {
    return (
      <span>
        Tip from <code>{prepareTipResult.merchantBaseUrl}</code> accepted. Check
        your transactions list for more details.
      </span>
    );
  } else {
    return (
      <div>
        <p>
          The merchant <code>{prepareTipResult.merchantBaseUrl}</code> is
          offering you a tip of{" "}
          <strong>
            <AmountView amount={prepareTipResult.tipAmountEffective} />
          </strong>{" "}
          via the exchange <code>{prepareTipResult.exchangeBaseUrl}</code>
        </p>
        <button onClick={doAccept}>Accept tip</button>
        <button onClick={doIgnore}>Ignore</button>
      </div>
    );
  }
}

export function createTipPage(): JSX.Element {
  const url = new URL(document.location.href);
  const talerTipUri = url.searchParams.get("talerTipUri");
  if (!talerTipUri) {
    throw Error("invalid parameter");
  }
  return <TalerTipDialog talerTipUri={talerTipUri} />;
}
