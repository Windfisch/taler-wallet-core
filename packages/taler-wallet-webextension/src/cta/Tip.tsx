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

import { AmountJson, Amounts, PrepareTipResult } from "@gnu-taler/taler-util";
import { h, VNode } from "preact";
import { useEffect, useState } from "preact/hooks";
import { Amount } from "../components/Amount.js";
import { Loading } from "../components/Loading.js";
import { LoadingError } from "../components/LoadingError.js";
import { LogoHeader } from "../components/LogoHeader.js";
import { Part } from "../components/Part.js";
import {
  Button,
  ButtonSuccess,
  SubTitle,
  WalletAction,
} from "../components/styled/index.js";
import { useTranslationContext } from "../context/translation.js";
import { HookError, useAsyncAsHook } from "../hooks/useAsyncAsHook.js";
import { ButtonHandler } from "../mui/handlers.js";
import * as wxApi from "../wxApi.js";

interface Props {
  talerTipUri?: string;
}

type State = Loading | Ready | Accepted | Ignored;

interface Loading {
  status: "loading";
  hook: HookError | undefined;
}

interface Ignored {
  status: "ignored";
  hook: undefined;
}
interface Accepted {
  status: "accepted";
  hook: undefined;
  merchantBaseUrl: string;
  amount: AmountJson;
  exchangeBaseUrl: string;
}
interface Ready {
  status: "ready";
  hook: undefined;
  merchantBaseUrl: string;
  amount: AmountJson;
  exchangeBaseUrl: string;
  accept: ButtonHandler;
  ignore: ButtonHandler;
}

export function useComponentState(
  talerTipUri: string | undefined,
  api: typeof wxApi,
): State {
  const [tipIgnored, setTipIgnored] = useState(false);

  const tipInfo = useAsyncAsHook(async () => {
    if (!talerTipUri) throw Error("ERROR_NO-URI-FOR-TIP");
    const tip = await api.prepareTip({ talerTipUri });
    return { tip };
  });

  if (!tipInfo || tipInfo.hasError) {
    return {
      status: "loading",
      hook: tipInfo,
    };
  }

  const { tip } = tipInfo.response;

  const doAccept = async (): Promise<void> => {
    await api.acceptTip({ walletTipId: tip.walletTipId });
    tipInfo.retry();
  };

  const doIgnore = async (): Promise<void> => {
    setTipIgnored(true);
  };

  if (tipIgnored) {
    return {
      status: "ignored",
      hook: undefined,
    };
  }

  if (tip.accepted) {
    return {
      status: "accepted",
      hook: undefined,
      merchantBaseUrl: tip.merchantBaseUrl,
      exchangeBaseUrl: tip.exchangeBaseUrl,
      amount: Amounts.parseOrThrow(tip.tipAmountEffective),
    };
  }

  return {
    status: "ready",
    hook: undefined,
    merchantBaseUrl: tip.merchantBaseUrl,
    exchangeBaseUrl: tip.exchangeBaseUrl,
    accept: {
      onClick: doAccept,
    },
    ignore: {
      onClick: doIgnore,
    },
    amount: Amounts.parseOrThrow(tip.tipAmountEffective),
  };
}

export function View({ state }: { state: State }): VNode {
  const { i18n } = useTranslationContext();
  if (state.status === "loading") {
    if (!state.hook) {
      return <Loading />;
    }
    return (
      <LoadingError
        title={<i18n.Translate>Could not load tip status</i18n.Translate>}
        error={state.hook}
      />
    );
  }

  if (state.status === "ignored") {
    return (
      <WalletAction>
        <LogoHeader />

        <SubTitle>
          <i18n.Translate>Digital cash tip</i18n.Translate>
        </SubTitle>
        <span>
          <i18n.Translate>You&apos;ve ignored the tip.</i18n.Translate>
        </span>
      </WalletAction>
    );
  }

  if (state.status === "accepted") {
    return (
      <WalletAction>
        <LogoHeader />

        <SubTitle>
          <i18n.Translate>Digital cash tip</i18n.Translate>
        </SubTitle>
        <section>
          <i18n.Translate>
            Tip from <code>{state.merchantBaseUrl}</code> accepted. Check your
            transactions list for more details.
          </i18n.Translate>
        </section>
      </WalletAction>
    );
  }

  return (
    <WalletAction>
      <LogoHeader />

      <SubTitle>
        <i18n.Translate>Digital cash tip</i18n.Translate>
      </SubTitle>

      <section>
        <p>
          <i18n.Translate>The merchant is offering you a tip</i18n.Translate>
        </p>
        <Part
          title={<i18n.Translate>Amount</i18n.Translate>}
          text={<Amount value={state.amount} />}
          kind="positive"
          big
        />
        <Part
          title={<i18n.Translate>Merchant URL</i18n.Translate>}
          text={state.merchantBaseUrl}
          kind="neutral"
        />
        <Part
          title={<i18n.Translate>Exchange</i18n.Translate>}
          text={state.exchangeBaseUrl}
          kind="neutral"
        />
      </section>
      <section>
        <Button
          variant="contained"
          color="success"
          onClick={state.accept.onClick}
        >
          <i18n.Translate>Accept tip</i18n.Translate>
        </Button>
        <Button onClick={state.ignore.onClick}>
          <i18n.Translate>Ignore</i18n.Translate>
        </Button>
      </section>
    </WalletAction>
  );
}

export function TipPage({ talerTipUri }: Props): VNode {
  const { i18n } = useTranslationContext();
  const state = useComponentState(talerTipUri, wxApi);

  if (!talerTipUri) {
    return (
      <span>
        <i18n.Translate>missing tip uri</i18n.Translate>
      </span>
    );
  }

  return <View state={state} />;
}
