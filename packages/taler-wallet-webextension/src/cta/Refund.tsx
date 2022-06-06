/*
 This file is part of GNU Taler
 (C) 2022 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
 * Page that shows refund status for purchases.
 *
 * @author sebasjm
 */

import {
  AmountJson,
  Amounts,
  NotificationType,
  Product,
} from "@gnu-taler/taler-util";
import { h, VNode } from "preact";
import { useEffect, useState } from "preact/hooks";
import { Amount } from "../components/Amount.js";
import { Loading } from "../components/Loading.js";
import { LoadingError } from "../components/LoadingError.js";
import { LogoHeader } from "../components/LogoHeader.js";
import { Part } from "../components/Part.js";
import {
  ButtonSuccess,
  SubTitle,
  WalletAction,
} from "../components/styled/index.js";
import { useTranslationContext } from "../context/translation.js";
import { HookError, useAsyncAsHook } from "../hooks/useAsyncAsHook.js";
import { Button } from "../mui/Button.js";
import { ButtonHandler } from "../mui/handlers.js";
import * as wxApi from "../wxApi.js";
import { ProductList } from "./Pay.js";

interface Props {
  talerRefundUri?: string;
}
export interface ViewProps {
  state: State;
}
export function View({ state }: ViewProps): VNode {
  const { i18n } = useTranslationContext();
  if (state.status === "loading") {
    if (!state.hook) {
      return <Loading />;
    }
    return (
      <LoadingError
        title={<i18n.Translate>Could not load refund status</i18n.Translate>}
        error={state.hook}
      />
    );
  }

  if (state.status === "ignored") {
    return (
      <WalletAction>
        <LogoHeader />

        <SubTitle>
          <i18n.Translate>Digital cash refund</i18n.Translate>
        </SubTitle>
        <section>
          <p>
            <i18n.Translate>You&apos;ve ignored the tip.</i18n.Translate>
          </p>
        </section>
      </WalletAction>
    );
  }

  if (state.status === "in-progress") {
    return (
      <WalletAction>
        <LogoHeader />

        <SubTitle>
          <i18n.Translate>Digital cash refund</i18n.Translate>
        </SubTitle>
        <section>
          <p>
            <i18n.Translate>The refund is in progress.</i18n.Translate>
          </p>
        </section>
        <section>
          <Part
            big
            title={<i18n.Translate>Total to refund</i18n.Translate>}
            text={<Amount value={state.awaitingAmount} />}
            kind="negative"
          />
          <Part
            big
            title={<i18n.Translate>Refunded</i18n.Translate>}
            text={<Amount value={state.amount} />}
            kind="negative"
          />
        </section>
        {state.products && state.products.length ? (
          <section>
            <ProductList products={state.products} />
          </section>
        ) : undefined}
        {/* <section>
          <ProgressBar value={state.progress} />
        </section> */}
      </WalletAction>
    );
  }

  if (state.status === "completed") {
    return (
      <WalletAction>
        <LogoHeader />

        <SubTitle>
          <i18n.Translate>Digital cash refund</i18n.Translate>
        </SubTitle>
        <section>
          <p>
            <i18n.Translate>this refund is already accepted.</i18n.Translate>
          </p>
        </section>
        <section>
          <Part
            big
            title={<i18n.Translate>Total to refunded</i18n.Translate>}
            text={<Amount value={state.granted} />}
            kind="negative"
          />
        </section>
      </WalletAction>
    );
  }

  return (
    <WalletAction>
      <LogoHeader />

      <SubTitle>
        <i18n.Translate>Digital cash refund</i18n.Translate>
      </SubTitle>
      <section>
        <p>
          <i18n.Translate>
            The merchant &quot;<b>{state.merchantName}</b>&quot; is offering you
            a refund.
          </i18n.Translate>
        </p>
      </section>
      <section>
        <Part
          big
          title={<i18n.Translate>Order amount</i18n.Translate>}
          text={<Amount value={state.amount} />}
          kind="neutral"
        />
        {Amounts.isNonZero(state.granted) && (
          <Part
            big
            title={<i18n.Translate>Already refunded</i18n.Translate>}
            text={<Amount value={state.granted} />}
            kind="neutral"
          />
        )}
        <Part
          big
          title={<i18n.Translate>Refund offered</i18n.Translate>}
          text={<Amount value={state.awaitingAmount} />}
          kind="positive"
        />
      </section>
      {state.products && state.products.length ? (
        <section>
          <ProductList products={state.products} />
        </section>
      ) : undefined}
      <section>
        <Button variant="contained" onClick={state.accept.onClick}>
          <i18n.Translate>Confirm refund</i18n.Translate>
        </Button>
      </section>
    </WalletAction>
  );
}

type State = Loading | Ready | Ignored | InProgress | Completed;

interface Loading {
  status: "loading";
  hook: HookError | undefined;
}
interface Ready {
  status: "ready";
  hook: undefined;
  merchantName: string;
  products: Product[] | undefined;
  amount: AmountJson;
  awaitingAmount: AmountJson;
  granted: AmountJson;
  accept: ButtonHandler;
  ignore: ButtonHandler;
  orderId: string;
}
interface Ignored {
  status: "ignored";
  hook: undefined;
  merchantName: string;
}
interface InProgress {
  status: "in-progress";
  hook: undefined;
  merchantName: string;
  products: Product[] | undefined;
  amount: AmountJson;
  awaitingAmount: AmountJson;
  granted: AmountJson;
}
interface Completed {
  status: "completed";
  hook: undefined;
  merchantName: string;
  products: Product[] | undefined;
  amount: AmountJson;
  granted: AmountJson;
}

export function useComponentState(
  talerRefundUri: string | undefined,
  api: typeof wxApi,
): State {
  const [ignored, setIgnored] = useState(false);

  const info = useAsyncAsHook(async () => {
    if (!talerRefundUri) throw Error("ERROR_NO-URI-FOR-REFUND");
    const refund = await api.prepareRefund({ talerRefundUri });
    return { refund, uri: talerRefundUri };
  });

  useEffect(() => {
    api.onUpdateNotification([NotificationType.RefreshMelted], () => {
      info?.retry();
    });
  });

  if (!info || info.hasError) {
    return {
      status: "loading",
      hook: info,
    };
  }

  const { refund, uri } = info.response;

  const doAccept = async (): Promise<void> => {
    await api.applyRefund(uri);
    info.retry();
  };

  const doIgnore = async (): Promise<void> => {
    setIgnored(true);
  };

  if (ignored) {
    return {
      status: "ignored",
      hook: undefined,
      merchantName: info.response.refund.info.merchant.name,
    };
  }

  const awaitingAmount = Amounts.parseOrThrow(refund.awaiting);

  if (Amounts.isZero(awaitingAmount)) {
    return {
      status: "completed",
      hook: undefined,
      amount: Amounts.parseOrThrow(info.response.refund.effectivePaid),
      granted: Amounts.parseOrThrow(info.response.refund.granted),
      merchantName: info.response.refund.info.merchant.name,
      products: info.response.refund.info.products,
    };
  }

  if (refund.pending) {
    return {
      status: "in-progress",
      hook: undefined,
      awaitingAmount,
      amount: Amounts.parseOrThrow(info.response.refund.effectivePaid),
      granted: Amounts.parseOrThrow(info.response.refund.granted),

      merchantName: info.response.refund.info.merchant.name,
      products: info.response.refund.info.products,
    };
  }

  return {
    status: "ready",
    hook: undefined,
    amount: Amounts.parseOrThrow(info.response.refund.effectivePaid),
    granted: Amounts.parseOrThrow(info.response.refund.granted),
    awaitingAmount,
    merchantName: info.response.refund.info.merchant.name,
    products: info.response.refund.info.products,
    orderId: info.response.refund.info.orderId,
    accept: {
      onClick: doAccept,
    },
    ignore: {
      onClick: doIgnore,
    },
  };
}

export function RefundPage({ talerRefundUri }: Props): VNode {
  const { i18n } = useTranslationContext();

  const state = useComponentState(talerRefundUri, wxApi);

  if (!talerRefundUri) {
    return (
      <span>
        <i18n.Translate>missing taler refund uri</i18n.Translate>
      </span>
    );
  }

  return <View state={state} />;
}

function ProgressBar({ value }: { value: number }): VNode {
  return (
    <div
      style={{
        width: 400,
        height: 20,
        backgroundColor: "white",
        border: "solid black 1px",
      }}
    >
      <div
        style={{
          width: `${value * 100}%`,
          height: "100%",
          backgroundColor: "lightgreen",
        }}
      ></div>
    </div>
  );
}
