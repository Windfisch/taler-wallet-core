/*
 This file is part of TALER
 (C) 2015-2016 GNUnet e.V.

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
 * Page that shows refund status for purchases.
 *
 * @author Florian Dold
 */

import * as wxApi from "../wxApi";
import { AmountView } from "../renderHtml";
import {
  ApplyRefundResponse,
  Amounts,
} from "@gnu-taler/taler-util";
import { useEffect, useState } from "preact/hooks";
import { JSX } from "preact/jsx-runtime";

interface Props {
  talerRefundUri?: string
}

export function RefundStatusView({ talerRefundUri }: Props): JSX.Element {
  const [applyResult, setApplyResult] = useState<ApplyRefundResponse | undefined>(undefined);
  const [errMsg, setErrMsg] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!talerRefundUri) return;
    const doFetch = async (): Promise<void> => {
      try {
        const result = await wxApi.applyRefund(talerRefundUri);
        setApplyResult(result);
      } catch (e) {
        console.error(e);
        setErrMsg(e.message);
        console.log("err message", e.message);
      }
    };
    doFetch();
  }, [talerRefundUri]);

  console.log("rendering");

  if (!talerRefundUri) {
    return <span>missing taler refund uri</span>;
  }

  if (errMsg) {
    return <span>Error: {errMsg}</span>;
  }

  if (!applyResult) {
    return <span>Updating refund status</span>;
  }

  return (
    <>
      <h2>Refund Status</h2>
      <p>
        The product <em>{applyResult.info.summary}</em> has received a total
        effective refund of{" "}
        <AmountView amount={applyResult.amountRefundGranted} />.
      </p>
      {applyResult.pendingAtExchange ? (
        <p>Refund processing is still in progress.</p>
      ) : null}
      {!Amounts.isZero(applyResult.amountRefundGone) ? (
        <p>
          The refund amount of{" "}
          <AmountView amount={applyResult.amountRefundGone} />
          could not be applied.
        </p>
      ) : null}
    </>
  );
}

/**
 * @deprecated to be removed
 */
export function createRefundPage(): JSX.Element {
  const url = new URL(document.location.href);

  const container = document.getElementById("container");
  if (!container) {
    throw Error("fatal: can't mount component, container missing");
  }

  const talerRefundUri = url.searchParams.get("talerRefundUri");
  if (!talerRefundUri) {
    throw Error("taler refund URI required");
  }

  return <RefundStatusView talerRefundUri={talerRefundUri} />;
}
