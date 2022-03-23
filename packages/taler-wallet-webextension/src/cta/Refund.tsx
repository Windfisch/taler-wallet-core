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
 * @author sebasjm
 */

import {
  amountFractionalBase,
  AmountJson,
  Amounts,
  ApplyRefundResponse,
} from "@gnu-taler/taler-util";
import { h, VNode } from "preact";
import { useEffect, useState } from "preact/hooks";
import { useTranslationContext } from "../context/translation";
import * as wxApi from "../wxApi";

interface Props {
  talerRefundUri?: string;
}
export interface ViewProps {
  applyResult: ApplyRefundResponse;
}
export function View({ applyResult }: ViewProps): VNode {
  const { i18n } = useTranslationContext();
  return (
    <section class="main">
      <h1>GNU Taler Wallet</h1>
      <article class="fade">
        <h2>
          <i18n.Translate>Refund Status</i18n.Translate>
        </h2>
        <p>
          <i18n.Translate>
            The product <em>{applyResult.info.summary}</em> has received a total
            effective refund of{" "}
          </i18n.Translate>
          <AmountView amount={applyResult.amountRefundGranted} />.
        </p>
        {applyResult.pendingAtExchange ? (
          <p>
            <i18n.Translate>
              Refund processing is still in progress.
            </i18n.Translate>
          </p>
        ) : null}
        {!Amounts.isZero(applyResult.amountRefundGone) ? (
          <p>
            <i18n.Translate>
              The refund amount of{" "}
              <AmountView amount={applyResult.amountRefundGone} /> could not be
              applied.
            </i18n.Translate>
          </p>
        ) : null}
      </article>
    </section>
  );
}
export function RefundPage({ talerRefundUri }: Props): VNode {
  const [applyResult, setApplyResult] = useState<
    ApplyRefundResponse | undefined
  >(undefined);
  const { i18n } = useTranslationContext();
  const [errMsg, setErrMsg] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!talerRefundUri) return;
    const doFetch = async (): Promise<void> => {
      try {
        const result = await wxApi.applyRefund(talerRefundUri);
        setApplyResult(result);
      } catch (e) {
        if (e instanceof Error) {
          setErrMsg(e.message);
          console.log("err message", e.message);
        }
      }
    };
    doFetch();
  }, [talerRefundUri]);

  console.log("rendering");

  if (!talerRefundUri) {
    return (
      <span>
        <i18n.Translate>missing taler refund uri</i18n.Translate>
      </span>
    );
  }

  if (errMsg) {
    return (
      <span>
        <i18n.Translate>Error: {errMsg}</i18n.Translate>
      </span>
    );
  }

  if (!applyResult) {
    return (
      <span>
        <i18n.Translate>Updating refund status</i18n.Translate>
      </span>
    );
  }

  return <View applyResult={applyResult} />;
}

export function renderAmount(amount: AmountJson | string): VNode {
  let a;
  if (typeof amount === "string") {
    a = Amounts.parse(amount);
  } else {
    a = amount;
  }
  if (!a) {
    return <span>(invalid amount)</span>;
  }
  const x = a.value + a.fraction / amountFractionalBase;
  return (
    <span>
      {x}&nbsp;{a.currency}
    </span>
  );
}

export const AmountView = ({
  amount,
}: {
  amount: AmountJson | string;
}): VNode => renderAmount(amount);
