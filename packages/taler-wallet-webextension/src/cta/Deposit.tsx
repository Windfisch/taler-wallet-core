/* eslint-disable @typescript-eslint/no-unused-vars */
/*
 This file is part of TALER
 (C) 2015 GNUnet e.V.

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
 * Page shown to the user to confirm entering
 * a contract.
 */

/**
 * Imports.
 */

import {
  AmountJson,
  Amounts,
  amountToPretty,
  ConfirmPayResult,
  ConfirmPayResultType,
  ContractTerms,
  NotificationType,
  PreparePayResult,
  PreparePayResultType,
} from "@gnu-taler/taler-util";
import { TalerError } from "@gnu-taler/taler-wallet-core";
import { Fragment, h, VNode } from "preact";
import { useEffect, useState } from "preact/hooks";
import { ErrorTalerOperation } from "../components/ErrorTalerOperation.js";
import { Loading } from "../components/Loading.js";
import { LoadingError } from "../components/LoadingError.js";
import { LogoHeader } from "../components/LogoHeader.js";
import { Part } from "../components/Part.js";
import {
  ErrorBox,
  SubTitle,
  SuccessBox,
  WalletAction,
  WarningBox,
} from "../components/styled/index.js";
import { useTranslationContext } from "../context/translation.js";
import { HookError, useAsyncAsHook } from "../hooks/useAsyncAsHook.js";
import * as wxApi from "../wxApi.js";

interface Props {
  talerDepositUri?: string;
  goBack: () => void;
}

type State = Loading | Ready;
interface Loading {
  status: "loading";
  hook: HookError | undefined;
}
interface Ready {
  status: "ready";
}

function useComponentState(uri: string | undefined): State {
  return {
    status: "loading",
    hook: undefined,
  };
}

export function DepositPage({ talerDepositUri, goBack }: Props): VNode {
  const { i18n } = useTranslationContext();

  const state = useComponentState(talerDepositUri);
  if (state.status === "loading") {
    if (!state.hook) return <Loading />;
    return (
      <LoadingError
        title={<i18n.Translate>Could not load pay status</i18n.Translate>}
        error={state.hook}
      />
    );
  }
  return <View state={state} />;
}

export interface ViewProps {
  state: State;
}
export function View({ state }: ViewProps): VNode {
  const { i18n } = useTranslationContext();

  return (
    <WalletAction>
      <LogoHeader />

      <SubTitle>
        <i18n.Translate>Digital cash deposit</i18n.Translate>
      </SubTitle>
    </WalletAction>
  );
}
