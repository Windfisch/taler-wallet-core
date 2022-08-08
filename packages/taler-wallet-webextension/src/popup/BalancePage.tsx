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

import { Amounts, Balance, NotificationType } from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";
import { useEffect, useState } from "preact/hooks";
import { BalanceTable } from "../components/BalanceTable.js";
import { JustInDevMode } from "../components/JustInDevMode.js";
import { Loading } from "../components/Loading.js";
import { LoadingError } from "../components/LoadingError.js";
import { MultiActionButton } from "../components/MultiActionButton.js";
import { useTranslationContext } from "../context/translation.js";
import { HookError, useAsyncAsHook } from "../hooks/useAsyncAsHook.js";
import { Button } from "../mui/Button.js";
import { ButtonHandler } from "../mui/handlers.js";
import { compose, StateViewMap } from "../utils/index.js";
import { AddNewActionView } from "../wallet/AddNewActionView.js";
import * as wxApi from "../wxApi.js";
import { NoBalanceHelp } from "./NoBalanceHelp.js";

export interface Props {
  goToWalletDeposit: (currency: string) => Promise<void>;
  goToWalletHistory: (currency: string) => Promise<void>;
  goToWalletManualWithdraw: () => Promise<void>;
}

export type State = State.Loading | State.Error | State.Action | State.Balances;

export namespace State {
  export interface Loading {
    status: "loading";
    error: undefined;
  }

  export interface Error {
    status: "error";
    error: HookError;
  }

  export interface Action {
    status: "action";
    error: undefined;
    cancel: ButtonHandler;
  }

  export interface Balances {
    status: "balance";
    error: undefined;
    balances: Balance[];
    addAction: ButtonHandler;
    goToWalletDeposit: (currency: string) => Promise<void>;
    goToWalletHistory: (currency: string) => Promise<void>;
    goToWalletManualWithdraw: ButtonHandler;
  }
}

function useComponentState(
  { goToWalletDeposit, goToWalletHistory, goToWalletManualWithdraw }: Props,
  api: typeof wxApi,
): State {
  const [addingAction, setAddingAction] = useState(false);
  const state = useAsyncAsHook(api.getBalance);

  useEffect(() => {
    return api.onUpdateNotification(
      [NotificationType.WithdrawGroupFinished],
      () => {
        state?.retry();
      },
    );
  });

  if (!state) {
    return {
      status: "loading",
      error: undefined,
    };
  }
  if (state.hasError) {
    return {
      status: "error",
      error: state,
    };
  }
  if (addingAction) {
    return {
      status: "action",
      error: undefined,
      cancel: {
        onClick: async () => setAddingAction(false),
      },
    };
  }
  return {
    status: "balance",
    error: undefined,
    balances: state.response.balances,
    addAction: {
      onClick: async () => setAddingAction(true),
    },
    goToWalletManualWithdraw: {
      onClick: goToWalletManualWithdraw,
    },
    goToWalletDeposit,
    goToWalletHistory,
  };
}

const viewMapping: StateViewMap<State> = {
  loading: Loading,
  error: ErrorView,
  action: ActionView,
  balance: BalanceView,
};

export const BalancePage = compose(
  "BalancePage",
  (p: Props) => useComponentState(p, wxApi),
  viewMapping,
);

function ErrorView({ error }: State.Error): VNode {
  const { i18n } = useTranslationContext();
  return (
    <LoadingError
      title={<i18n.Translate>Could not load balance page</i18n.Translate>}
      error={error}
    />
  );
}

function ActionView({ cancel }: State.Action): VNode {
  return <AddNewActionView onCancel={cancel.onClick!} />;
}

export function BalanceView(state: State.Balances): VNode {
  const { i18n } = useTranslationContext();
  const currencyWithNonZeroAmount = state.balances
    .filter((b) => !Amounts.isZero(b.available))
    .map((b) => b.available.split(":")[0]);

  if (state.balances.length === 0) {
    return (
      <NoBalanceHelp
        goToWalletManualWithdraw={state.goToWalletManualWithdraw}
      />
    );
  }

  return (
    <Fragment>
      <section>
        <BalanceTable
          balances={state.balances}
          goToWalletHistory={state.goToWalletHistory}
        />
      </section>
      <footer style={{ justifyContent: "space-between" }}>
        <Button
          variant="contained"
          onClick={state.goToWalletManualWithdraw.onClick}
        >
          <i18n.Translate>Withdraw</i18n.Translate>
        </Button>
        {currencyWithNonZeroAmount.length > 0 && (
          <MultiActionButton
            label={(s) => <i18n.Translate>Deposit {s}</i18n.Translate>}
            actions={currencyWithNonZeroAmount}
            onClick={(c) => state.goToWalletDeposit(c)}
          />
        )}
        <JustInDevMode>
          <Button onClick={state.addAction.onClick}>
            <i18n.Translate>Enter URI</i18n.Translate>
          </Button>
        </JustInDevMode>
      </footer>
    </Fragment>
  );
}
