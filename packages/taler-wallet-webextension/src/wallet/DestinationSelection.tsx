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

import { Amounts } from "@gnu-taler/taler-util";
import { styled } from "@linaria/react";
import { Fragment, h, VNode } from "preact";
import { useState } from "preact/hooks";
import { Loading } from "../components/Loading.js";
import { LoadingError } from "../components/LoadingError.js";
import { SelectList } from "../components/SelectList.js";
import {
  Input,
  LightText,
  LinkPrimary,
  SvgIcon,
} from "../components/styled/index.js";
import { useTranslationContext } from "../context/translation.js";
import { useAsyncAsHook } from "../hooks/useAsyncAsHook.js";
import { Button } from "../mui/Button.js";
import { Grid } from "../mui/Grid.js";
import { Paper } from "../mui/Paper.js";
import { TextField } from "../mui/TextField.js";
import { Pages } from "../NavigationBar.js";
import arrowIcon from "../svg/chevron-down.svg";
import bankIcon from "../svg/ri-bank-line.svg";
import * as wxApi from "../wxApi.js";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  & > * {
    margin: 8px;
  }
`;

interface PropsGet {
  amount?: string;
  goToWalletManualWithdraw: (amount: string) => void;
  goToWalletWalletInvoice: (amount: string) => void;
}
interface PropsSend {
  amount?: string;
  goToWalletBankDeposit: (amount: string) => void;
  goToWalletWalletSend: (amount: string) => void;
}

type Contact = {
  icon: string;
  name: string;
  description: string;
};

const ContactTable = styled.table`
  width: 100%;
  & > tr > td {
    padding: 8px;
    & > div:not([data-disabled]):hover {
      background-color: lightblue;
    }
    color: black;
    div[data-disabled] > * {
      color: gray;
    }
  }

  & > tr:nth-child(2n) {
    background: #ebebeb;
  }
`;

const MediaExample = styled.div`
  text-size-adjust: 100%;
  color: inherit;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  text-transform: none;
  text-align: left;
  box-sizing: border-box;
  align-items: center;
  display: flex;
  padding: 8px 8px;

  &[data-disabled]:hover {
    cursor: inherit;
  }
  cursor: pointer;
`;

const MediaLeft = styled.div`
  text-size-adjust: 100%;

  color: inherit;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  text-transform: none;
  text-align: left;
  box-sizing: border-box;
  padding-right: 8px;
  display: block;
`;

const MediaBody = styled.div`
  text-size-adjust: 100%;

  font-family: inherit;
  text-transform: none;
  text-align: left;
  box-sizing: border-box;
  flex: 1 1;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.42857;
`;
const MediaRight = styled.div`
  text-size-adjust: 100%;

  color: inherit;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  text-transform: none;
  text-align: left;
  box-sizing: border-box;
  padding-left: 8px;
`;

const CircleDiv = styled.div`
  box-sizing: border-box;
  align-items: center;
  background-position: 50%;
  background-repeat: no-repeat;
  background-size: cover;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  margin-left: auto;
  margin-right: auto;
  overflow: hidden;
  text-align: center;
  text-decoration: none;
  text-transform: uppercase;
  transition: background-color 0.15s ease, border-color 0.15s ease,
    color 0.15s ease;
  font-size: 16px;
  background-color: #86a7bd1a;
  height: 40px;
  line-height: 40px;
  width: 40px;
  border: none;
`;

export function SelectCurrency({
  onChange,
}: {
  onChange: (s: string) => void;
}): VNode {
  const { i18n } = useTranslationContext();

  const hook = useAsyncAsHook(wxApi.listExchangesDetailled);

  if (!hook) {
    return <Loading />;
  }
  if (hook.hasError) {
    return (
      <LoadingError
        error={hook}
        title={<i18n.Translate>Could not load list of exchange</i18n.Translate>}
      />
    );
  }
  const list: Record<string, string> = {};
  hook.response.exchanges.forEach((e) => (list[e.currency] = e.currency));
  list[""] = "Select a currency";
  return <SelectCurrencyView onChange={onChange} list={list} />;
}

export function SelectCurrencyView({
  onChange,
  list,
}: {
  onChange: (s: string) => void;
  list: Record<string, string>;
}): VNode {
  const { i18n } = useTranslationContext();

  return (
    <Fragment>
      <h2>
        <i18n.Translate>
          Choose a currency to proceed or add another exchange
        </i18n.Translate>
      </h2>

      <p>
        <Input>
          <SelectList
            label={<i18n.Translate>Known currencies</i18n.Translate>}
            list={list}
            name="lang"
            value={""}
            onChange={(v) => onChange(v)}
          />
        </Input>
      </p>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div />
        <LinkPrimary href={Pages.settingsExchangeAdd({})}>
          <i18n.Translate>Add an exchange</i18n.Translate>
        </LinkPrimary>
      </div>
    </Fragment>
  );
}

function RowExample({
  info,
  disabled,
}: {
  info: Contact;
  disabled?: boolean;
}): VNode {
  return (
    <MediaExample data-disabled={disabled}>
      <MediaLeft>
        <CircleDiv>
          <SvgIcon
            title={info.name}
            dangerouslySetInnerHTML={{ __html: info.icon }}
            color="currentColor"
          />
        </CircleDiv>
      </MediaLeft>
      <MediaBody>
        <span>{info.name}</span>
        <LightText>{info.description}</LightText>
      </MediaBody>
      <MediaRight>
        <SvgIcon
          title="Select this contact"
          dangerouslySetInnerHTML={{ __html: arrowIcon }}
          color="currentColor"
          transform="rotate(-90deg)"
        />
      </MediaRight>
    </MediaExample>
  );
}

export function DestinationSelectionGetCash({
  amount: initialAmount,
  goToWalletManualWithdraw,
  goToWalletWalletInvoice,
}: PropsGet): VNode {
  const parsedInitialAmount = !initialAmount
    ? undefined
    : Amounts.parse(initialAmount);
  const parsedInitialAmountValue = !parsedInitialAmount
    ? "0"
    : Amounts.stringifyValue(parsedInitialAmount);
  const [currency, setCurrency] = useState(parsedInitialAmount?.currency);

  const [amount, setAmount] = useState(parsedInitialAmountValue);
  const { i18n } = useTranslationContext();
  const previous1: Contact[] = [];
  const previous2: Contact[] = [
    {
      name: "International Bank",
      icon: bankIcon,
      description: "account ending with 3454",
    },
    {
      name: "Max",
      icon: bankIcon,
      description: "account ending with 3454",
    },
    {
      name: "Alex",
      icon: bankIcon,
      description: "account ending with 3454",
    },
  ];
  const previous = previous1;

  if (!currency) {
    return (
      <div>
        <SelectCurrency onChange={(c) => setCurrency(c)} />
      </div>
    );
  }
  const currencyAndAmount = `${currency}:${amount}`;
  const parsedAmount = Amounts.parse(currencyAndAmount);
  // const dirty = parsedInitialAmountValue !== amount;
  const invalid = !parsedAmount || Amounts.isZero(parsedAmount);
  return (
    <Container>
      <h1>
        <i18n.Translate>Specify the amount and the origin</i18n.Translate>
      </h1>
      <Grid container columns={2} justifyContent="space-between">
        <TextField
          label="Amount"
          type="number"
          variant="filled"
          error={invalid}
          required
          startAdornment={
            <div style={{ padding: "25px 12px 8px 12px" }}>{currency}</div>
          }
          value={amount}
          onChange={(e) => {
            setAmount(e);
          }}
        />
        <Button onClick={async () => setCurrency(undefined)}>
          Change currency
        </Button>
      </Grid>

      <Grid container spacing={1} columns={1}>
        {previous.length > 0 ? (
          <Fragment>
            <p>Use previous origins:</p>
            <Grid item xs={1}>
              <Paper style={{ padding: 8 }}>
                <ContactTable>
                  {previous.map((info, i) => (
                    <tr key={i}>
                      <td>
                        <RowExample info={info} disabled={invalid} />
                      </td>
                    </tr>
                  ))}
                </ContactTable>
              </Paper>
            </Grid>
          </Fragment>
        ) : undefined}
        {previous.length > 0 ? (
          <Grid item>
            <p>Or specify a new origin for the money</p>
          </Grid>
        ) : (
          <Grid item>
            <p>Specify a origin for the money</p>
          </Grid>
        )}
        <Grid item container columns={2} spacing={1}>
          <Grid item xs={1}>
            <Paper style={{ padding: 8 }}>
              <p>From my bank account</p>
              <Button
                disabled={invalid}
                onClick={async () =>
                  goToWalletManualWithdraw(currencyAndAmount)
                }
              >
                Withdraw
              </Button>
            </Paper>
          </Grid>
          <Grid item xs={1}>
            <Paper style={{ padding: 8 }}>
              <p>From another wallet</p>
              <Button
                disabled={invalid}
                onClick={async () => goToWalletWalletInvoice(currencyAndAmount)}
              >
                Invoice
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </Grid>
    </Container>
  );
}

export function DestinationSelectionSendCash({
  amount: initialAmount,
  goToWalletBankDeposit,
  goToWalletWalletSend,
}: PropsSend): VNode {
  const parsedInitialAmount = !initialAmount
    ? undefined
    : Amounts.parse(initialAmount);
  const parsedInitialAmountValue = !parsedInitialAmount
    ? ""
    : Amounts.stringifyValue(parsedInitialAmount);
  const currency = parsedInitialAmount?.currency;

  const [amount, setAmount] = useState(parsedInitialAmountValue);
  const { i18n } = useTranslationContext();
  const previous1: Contact[] = [];
  const previous2: Contact[] = [
    {
      name: "International Bank",
      icon: bankIcon,
      description: "account ending with 3454",
    },
    {
      name: "Max",
      icon: bankIcon,
      description: "account ending with 3454",
    },
    {
      name: "Alex",
      icon: bankIcon,
      description: "account ending with 3454",
    },
  ];
  const previous = previous1;

  if (!currency) {
    return <div>currency not provided</div>;
  }
  const currencyAndAmount = `${currency}:${amount}`;
  const parsedAmount = Amounts.parse(currencyAndAmount);
  const invalid = !parsedAmount || Amounts.isZero(parsedAmount);
  return (
    <Container>
      <h1>
        <i18n.Translate>Specify the amount and the destination</i18n.Translate>
      </h1>

      <div>
        <TextField
          label="Amount"
          type="number"
          variant="filled"
          required
          error={invalid}
          startAdornment={
            <div style={{ padding: "25px 12px 8px 12px" }}>{currency}</div>
          }
          value={amount}
          onChange={(e) => {
            setAmount(e);
          }}
        />
      </div>

      <Grid container spacing={1} columns={1}>
        {previous.length > 0 ? (
          <Fragment>
            <p>Use previous destinations:</p>
            <Grid item xs={1}>
              <Paper style={{ padding: 8 }}>
                <ContactTable>
                  {previous.map((info, i) => (
                    <tr key={i}>
                      <td>
                        <RowExample info={info} disabled={invalid} />
                      </td>
                    </tr>
                  ))}
                </ContactTable>
              </Paper>
            </Grid>
          </Fragment>
        ) : undefined}
        {previous.length > 0 ? (
          <Grid item>
            <p>Or specify a new destination for the money</p>
          </Grid>
        ) : (
          <Grid item>
            <p>Specify a destination for the money</p>
          </Grid>
        )}
        <Grid item container columns={2} spacing={1}>
          <Grid item xs={1}>
            <Paper style={{ padding: 8 }}>
              <p>To my bank account</p>
              <Button
                disabled={invalid}
                onClick={async () => goToWalletBankDeposit(currencyAndAmount)}
              >
                Deposit
              </Button>
            </Paper>
          </Grid>
          <Grid item xs={1}>
            <Paper style={{ padding: 8 }}>
              <p>To another wallet</p>
              <Button
                disabled={invalid}
                onClick={async () => goToWalletWalletSend(currencyAndAmount)}
              >
                Send
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </Grid>
    </Container>
  );
}
