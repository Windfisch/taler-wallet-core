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
 * @author sebasjm
 */

import {
  amountFractionalBase,
  AmountJson,
  Amounts,
  PrepareTipResult,
} from "@gnu-taler/taler-util";
import { h, VNode } from "preact";
import { useEffect, useState } from "preact/hooks";
import { Loading } from "../components/Loading";
import { useTranslationContext } from "../context/translation";
import * as wxApi from "../wxApi";

interface Props {
  talerTipUri?: string;
}
export interface ViewProps {
  prepareTipResult: PrepareTipResult;
  onAccept: () => void;
  onIgnore: () => void;
}
export function View({
  prepareTipResult,
  onAccept,
  onIgnore,
}: ViewProps): VNode {
  const { i18n } = useTranslationContext();
  return (
    <section class="main">
      <h1>GNU Taler Wallet</h1>
      <article class="fade">
        {prepareTipResult.accepted ? (
          <span>
            <i18n.Translate>
              Tip from <code>{prepareTipResult.merchantBaseUrl}</code> accepted.
              Check your transactions list for more details.
            </i18n.Translate>
          </span>
        ) : (
          <div>
            <p>
              <i18n.Translate>
                The merchant <code>{prepareTipResult.merchantBaseUrl}</code> is
                offering you a tip of{" "}
                <strong>
                  <AmountView amount={prepareTipResult.tipAmountEffective} />
                </strong>{" "}
                via the exchange <code>{prepareTipResult.exchangeBaseUrl}</code>
              </i18n.Translate>
            </p>
            <button onClick={onAccept}>
              <i18n.Translate>Accept tip</i18n.Translate>
            </button>
            <button onClick={onIgnore}>
              <i18n.Translate>Ignore</i18n.Translate>
            </button>
          </div>
        )}
      </article>
    </section>
  );
}

export function TipPage({ talerTipUri }: Props): VNode {
  const { i18n } = useTranslationContext();
  const [updateCounter, setUpdateCounter] = useState<number>(0);
  const [prepareTipResult, setPrepareTipResult] = useState<
    PrepareTipResult | undefined
  >(undefined);

  const [tipIgnored, setTipIgnored] = useState(false);

  useEffect(() => {
    if (!talerTipUri) return;
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

  if (!talerTipUri) {
    return (
      <span>
        <i18n.Translate>missing tip uri</i18n.Translate>
      </span>
    );
  }

  if (tipIgnored) {
    return (
      <span>
        <i18n.Translate>You've ignored the tip.</i18n.Translate>
      </span>
    );
  }

  if (!prepareTipResult) {
    return <Loading />;
  }

  return (
    <View
      prepareTipResult={prepareTipResult}
      onAccept={doAccept}
      onIgnore={doIgnore}
    />
  );
}

function renderAmount(amount: AmountJson | string): VNode {
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

const AmountView = ({ amount }: { amount: AmountJson | string }): VNode =>
  renderAmount(amount);
