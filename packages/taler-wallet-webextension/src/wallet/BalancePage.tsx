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

import { Amounts, Balance, i18n } from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";
import { BalanceTable } from "../components/BalanceTable";
import { Loading } from "../components/Loading";
import { LoadingError } from "../components/LoadingError";
import { MultiActionButton } from "../components/MultiActionButton";
import { ButtonPrimary, Centered } from "../components/styled";
import { useAsyncAsHook } from "../hooks/useAsyncAsHook";
import { PageLink } from "../renderHtml";
import * as wxApi from "../wxApi";

interface Props {
  goToWalletDeposit: (currency: string) => void;
  goToWalletHistory: (currency: string) => void;
  goToWalletManualWithdraw: () => void;
}

export function BalancePage({
  goToWalletManualWithdraw,
  goToWalletDeposit,
  goToWalletHistory,
}: Props): VNode {
  const state = useAsyncAsHook(wxApi.getBalance);

  const balances = !state || state.hasError ? [] : state.response.balances;

  if (!state) {
    return <Loading />;
  }

  if (state.hasError) {
    return <LoadingError title="Could not load balance page" error={state} />;
  }

  return (
    <BalanceView
      balances={balances}
      goToWalletManualWithdraw={goToWalletManualWithdraw}
      goToWalletDeposit={goToWalletDeposit}
      goToWalletHistory={goToWalletHistory}
    />
  );
}

export interface BalanceViewProps {
  balances: Balance[];
  goToWalletManualWithdraw: () => void;
  goToWalletDeposit: (currency: string) => void;
  goToWalletHistory: (currency: string) => void;
}

export function BalanceView({
  balances,
  goToWalletManualWithdraw,
  goToWalletDeposit,
  goToWalletHistory,
}: BalanceViewProps): VNode {
  const currencyWithNonZeroAmount = balances
    .filter((b) => !Amounts.isZero(b.available))
    .map((b) => b.available.split(":")[0]);

  if (balances.length === 0) {
    return (
      <Fragment>
        <p>
          <Centered style={{ marginTop: 100 }}>
            <i18n.Translate>
              You have no balance to show. Need some{" "}
              <PageLink pageName="/welcome">help</PageLink> getting started?
            </i18n.Translate>
          </Centered>
        </p>
        <footer style={{ justifyContent: "space-between" }}>
          <div />
          <ButtonPrimary onClick={goToWalletManualWithdraw}>
            Withdraw
          </ButtonPrimary>
        </footer>
      </Fragment>
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
          Withdraw
        </ButtonPrimary>
        {currencyWithNonZeroAmount.length > 0 && (
          <MultiActionButton
            label={(s) => `Deposit ${s}`}
            actions={currencyWithNonZeroAmount}
            onClick={(c) => goToWalletDeposit(c)}
          />
        )}
      </footer>
    </Fragment>
  );
}
