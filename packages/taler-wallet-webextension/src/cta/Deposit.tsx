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
  AmountString,
  CreateDepositGroupResponse,
} from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";
import { useState } from "preact/hooks";
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

interface Props {
  talerDepositUri?: string;
  amount: AmountString;
  goBack: () => Promise<void>;
}

type State = Loading | Ready | Completed;
interface Loading {
  status: "loading";
  hook: HookError | undefined;
}
interface Ready {
  status: "ready";
  hook: undefined;
  fee: AmountJson;
  cost: AmountJson;
  effective: AmountJson;
  confirm: ButtonHandler;
}
interface Completed {
  status: "completed";
  hook: undefined;
}

export function useComponentState(
  talerDepositUri: string | undefined,
  amountStr: AmountString | undefined,
  api: typeof wxApi,
): State {
  const [result, setResult] = useState<CreateDepositGroupResponse | undefined>(
    undefined,
  );

  const info = useAsyncAsHook(async () => {
    if (!talerDepositUri) throw Error("ERROR_NO-URI-FOR-DEPOSIT");
    if (!amountStr) throw Error("ERROR_NO-AMOUNT-FOR-DEPOSIT");
    const amount = Amounts.parse(amountStr);
    if (!amount) throw Error("ERROR_INVALID-AMOUNT-FOR-DEPOSIT");
    const deposit = await api.prepareDeposit(
      talerDepositUri,
      Amounts.stringify(amount),
    );
    return { deposit, uri: talerDepositUri, amount };
  });

  if (!info || info.hasError) {
    return {
      status: "loading",
      hook: info,
    };
  }

  const { deposit, uri, amount } = info.response;
  async function doDeposit(): Promise<void> {
    const resp = await api.createDepositGroup(uri, Amounts.stringify(amount));
    setResult(resp);
  }

  if (result !== undefined) {
    return {
      status: "completed",
      hook: undefined,
    };
  }

  return {
    status: "ready",
    hook: undefined,
    confirm: {
      onClick: doDeposit,
    },
    fee: Amounts.sub(deposit.totalDepositCost, deposit.effectiveDepositAmount)
      .amount,
    cost: deposit.totalDepositCost,
    effective: deposit.effectiveDepositAmount,
  };
}

export function DepositPage({ talerDepositUri, amount, goBack }: Props): VNode {
  const { i18n } = useTranslationContext();

  const state = useComponentState(talerDepositUri, amount, wxApi);

  if (!talerDepositUri) {
    return (
      <span>
        <i18n.Translate>missing taler deposit uri</i18n.Translate>
      </span>
    );
  }

  return <View state={state} />;
}

export interface ViewProps {
  state: State;
}
export function View({ state }: ViewProps): VNode {
  const { i18n } = useTranslationContext();

  if (state.status === "loading") {
    if (!state.hook) return <Loading />;
    return (
      <LoadingError
        title={<i18n.Translate>Could not load deposit status</i18n.Translate>}
        error={state.hook}
      />
    );
  }

  if (state.status === "completed") {
    return (
      <WalletAction>
        <LogoHeader />

        <SubTitle>
          <i18n.Translate>Digital cash deposit</i18n.Translate>
        </SubTitle>
        <section>
          <p>
            <i18n.Translate>deposit completed</i18n.Translate>
          </p>
        </section>
      </WalletAction>
    );
  }

  return (
    <WalletAction>
      <LogoHeader />

      <SubTitle>
        <i18n.Translate>Digital cash deposit</i18n.Translate>
      </SubTitle>
      <section>
        {Amounts.isNonZero(state.cost) && (
          <Part
            big
            title={<i18n.Translate>Cost</i18n.Translate>}
            text={<Amount value={state.cost} />}
            kind="negative"
          />
        )}
        {Amounts.isNonZero(state.fee) && (
          <Part
            big
            title={<i18n.Translate>Fee</i18n.Translate>}
            text={<Amount value={state.fee} />}
            kind="negative"
          />
        )}
        <Part
          big
          title={<i18n.Translate>To be received</i18n.Translate>}
          text={<Amount value={state.effective} />}
          kind="positive"
        />
      </section>
      <section>
        <Button
          variant="contained"
          color="success"
          onClick={state.confirm.onClick}
        >
          <i18n.Translate>
            Deposit {<Amount value={state.effective} />}
          </i18n.Translate>
        </Button>
      </section>
    </WalletAction>
  );
}
