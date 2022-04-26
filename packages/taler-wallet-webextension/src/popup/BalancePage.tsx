/*
 This file is part of TALER
 (C) 2016 GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import { Amounts, Balance, NotificationType } from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";
import { useEffect, useState } from "preact/hooks";
import { BalanceTable } from "../components/BalanceTable.js";
import { JustInDevMode } from "../components/JustInDevMode.js";
import { Loading } from "../components/Loading.js";
import { LoadingError } from "../components/LoadingError.js";
import { MultiActionButton } from "../components/MultiActionButton.js";
import { ButtonBoxPrimary, ButtonPrimary } from "../components/styled/index.js";
import { useTranslationContext } from "../context/translation.js";
import { useAsyncAsHook2 } from "../hooks/useAsyncAsHook.js";
import { AddNewActionView } from "../wallet/AddNewActionView.js";
import * as wxApi from "../wxApi.js";
import { NoBalanceHelp } from "./NoBalanceHelp.js";

export interface Props {
  goToWalletDeposit: (currency: string) => void;
  goToWalletHistory: (currency: string) => void;
  goToWalletManualWithdraw: () => void;
}
export function BalancePage({
  goToWalletManualWithdraw,
  goToWalletDeposit,
  goToWalletHistory,
}: Props): VNode {
  const { i18n } = useTranslationContext();
  const [addingAction, setAddingAction] = useState(false);
  const state = useAsyncAsHook2(wxApi.getBalance);

  useEffect(() => {
    wxApi.onUpdateNotification([NotificationType.WithdrawGroupFinished], () => {
      state?.retry();
    });
  });

  const balances = !state || state.hasError ? [] : state.response.balances;

  if (!state) {
    return <Loading />;
  }

  if (state.hasError) {
    return (
      <LoadingError
        title={<i18n.Translate>Could not load balance page</i18n.Translate>}
        error={state}
      />
    );
  }

  if (addingAction) {
    return <AddNewActionView onCancel={() => setAddingAction(false)} />;
  }

  return (
    <BalanceView
      balances={balances}
      goToWalletManualWithdraw={goToWalletManualWithdraw}
      goToWalletDeposit={goToWalletDeposit}
      goToWalletHistory={goToWalletHistory}
      goToAddAction={() => setAddingAction(true)}
    />
  );
}
export interface BalanceViewProps {
  balances: Balance[];
  goToWalletManualWithdraw: () => void;
  goToAddAction: () => void;
  goToWalletDeposit: (currency: string) => void;
  goToWalletHistory: (currency: string) => void;
}

export function BalanceView({
  balances,
  goToWalletManualWithdraw,
  goToWalletDeposit,
  goToWalletHistory,
  goToAddAction,
}: BalanceViewProps): VNode {
  const { i18n } = useTranslationContext();
  const currencyWithNonZeroAmount = balances
    .filter((b) => !Amounts.isZero(b.available))
    .map((b) => b.available.split(":")[0]);

  if (balances.length === 0) {
    return (
      <NoBalanceHelp goToWalletManualWithdraw={goToWalletManualWithdraw} />
    );
  }

  return (
    <Fragment>
      <section>
        <BalanceTable
          balances={balances}
          goToWalletHistory={goToWalletHistory}
        />
      </section>
      <footer style={{ justifyContent: "space-between" }}>
        <ButtonPrimary onClick={goToWalletManualWithdraw}>
          <i18n.Translate>Withdraw</i18n.Translate>
        </ButtonPrimary>
        {currencyWithNonZeroAmount.length > 0 && (
          <MultiActionButton
            label={(s) => (
              <i18n.Translate>Deposit {<span>{s}</span>}</i18n.Translate>
            )}
            actions={currencyWithNonZeroAmount}
            onClick={(c) => goToWalletDeposit(c)}
          />
        )}
        <JustInDevMode>
          <ButtonBoxPrimary onClick={goToAddAction}>
            <i18n.Translate>Enter URI</i18n.Translate>
          </ButtonBoxPrimary>
        </JustInDevMode>
      </footer>
    </Fragment>
  );
}
