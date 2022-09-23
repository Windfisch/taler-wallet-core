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

import { Amounts, PaytoUri } from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";
import { ErrorMessage } from "../../components/ErrorMessage.js";
import { LoadingError } from "../../components/LoadingError.js";
import { SelectList } from "../../components/SelectList.js";
import {
  ErrorText,
  Input,
  InputWithLabel,
  SubTitle,
  WarningBox,
} from "../../components/styled/index.js";
import { useTranslationContext } from "../../context/translation.js";
import { Button } from "../../mui/Button.js";
import { State } from "./index.js";

export function LoadingErrorView({ error }: State.LoadingUriError): VNode {
  const { i18n } = useTranslationContext();

  return (
    <LoadingError
      title={<i18n.Translate>Could not load deposit balance</i18n.Translate>}
      error={error}
    />
  );
}

export function AmountOrCurrencyErrorView(
  p: State.AmountOrCurrencyError,
): VNode {
  const { i18n } = useTranslationContext();

  return (
    <ErrorMessage
      title={
        <i18n.Translate>
          A currency or an amount should be indicated
        </i18n.Translate>
      }
    />
  );
}

export function NoEnoughBalanceView({
  currency,
}: State.NoEnoughBalance): VNode {
  const { i18n } = useTranslationContext();

  return (
    <ErrorMessage
      title={
        <i18n.Translate>
          There is no enough balance to make a deposit for currency {currency}
        </i18n.Translate>
      }
    />
  );
}

function AccountDetails({ account }: { account: PaytoUri }): VNode {
  if (account.isKnown) {
    if (account.targetType === "bitcoin") {
      return (
        <dl>
          <dt>Bitcoin</dt>
          <dd>{account.targetPath}</dd>
        </dl>
      );
    }
    if (account.targetType === "x-taler-bank") {
      return (
        <dl>
          <dt>Bank host</dt>
          <dd>{account.targetPath.split("/")[0]}</dd>
          <dt>Account name</dt>
          <dd>{account.targetPath.split("/")[1]}</dd>
        </dl>
      );
    }
    if (account.targetType === "iban") {
      return (
        <dl>
          <dt>IBAN</dt>
          <dd>{account.targetPath}</dd>
        </dl>
      );
    }
  }
  return <Fragment />;
}

export function NoAccountToDepositView({
  currency,
  onAddAccount,
}: State.NoAccounts): VNode {
  const { i18n } = useTranslationContext();

  return (
    <Fragment>
      <SubTitle>
        <i18n.Translate>Send {currency} to your account</i18n.Translate>
      </SubTitle>

      <WarningBox>
        <i18n.Translate>
          There is no account to make a deposit for currency {currency}
        </i18n.Translate>
      </WarningBox>

      <Button onClick={onAddAccount.onClick} variant="contained">
        <i18n.Translate>Add account</i18n.Translate>
      </Button>
    </Fragment>
  );
}

export function ReadyView(state: State.Ready): VNode {
  const { i18n } = useTranslationContext();

  return (
    <Fragment>
      <SubTitle>
        <i18n.Translate>Send {state.currency} to your account</i18n.Translate>
      </SubTitle>
      <section>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <Input>
            <SelectList
              label={<i18n.Translate>Select account</i18n.Translate>}
              list={state.account.list}
              name="account"
              value={state.account.value}
              onChange={state.account.onChange}
            />
          </Input>
          <Button
            onClick={state.onAddAccount.onClick}
            variant="text"
            style={{ marginLeft: "auto" }}
          >
            <i18n.Translate>Add another account</i18n.Translate>
          </Button>
        </div>

        {state.selectedAccount && (
          <Fragment>
            <p>
              <AccountDetails account={state.selectedAccount} />
            </p>
            <InputWithLabel invalid={!!state.amount.error}>
              <label>
                <i18n.Translate>Amount</i18n.Translate>
              </label>
              <div>
                <span>{state.currency}</span>
                <input
                  type="number"
                  value={state.amount.value}
                  onInput={(e) => state.amount.onInput(e.currentTarget.value)}
                />
              </div>
              {state.amount.error && (
                <ErrorText>{state.amount.error}</ErrorText>
              )}
            </InputWithLabel>

            <InputWithLabel>
              <label>
                <i18n.Translate>Deposit fee</i18n.Translate>
              </label>
              <div>
                <span>{state.currency}</span>
                <input
                  type="number"
                  disabled
                  value={Amounts.stringifyValue(state.totalFee)}
                />
              </div>
            </InputWithLabel>

            <InputWithLabel>
              <label>
                <i18n.Translate>Total deposit</i18n.Translate>
              </label>
              <div>
                <span>{state.currency}</span>
                <input
                  type="number"
                  disabled
                  value={Amounts.stringifyValue(state.totalToDeposit)}
                />
              </div>
            </InputWithLabel>
          </Fragment>
        )}
      </section>
      <footer>
        <Button
          variant="contained"
          color="secondary"
          onClick={state.cancelHandler.onClick}
        >
          <i18n.Translate>Cancel</i18n.Translate>
        </Button>
        {!state.depositHandler.onClick ? (
          <Button variant="contained" disabled>
            <i18n.Translate>Deposit</i18n.Translate>
          </Button>
        ) : (
          <Button variant="contained" onClick={state.depositHandler.onClick}>
            <i18n.Translate>
              Deposit&nbsp;{Amounts.stringifyValue(state.totalToDeposit)}{" "}
              {state.currency}
            </i18n.Translate>
          </Button>
        )}
      </footer>
    </Fragment>
  );
}
