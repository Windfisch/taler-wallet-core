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

import { styled } from "@linaria/react";
import { Fragment, h, VNode } from "preact";
import { LoadingError } from "../../components/LoadingError.js";
import { SelectList } from "../../components/SelectList.js";
import {
  Input,
  LightText,
  LinkPrimary,
  SvgIcon,
} from "../../components/styled/index.js";
import { useTranslationContext } from "../../context/translation.js";
import { Pages } from "../../NavigationBar.js";
import { Contact, State } from "./index.js";
import arrowIcon from "../../svg/chevron-down.svg";
import { AmountField } from "../../components/AmountField.js";
import { Grid } from "../../mui/Grid.js";
import { Paper } from "../../mui/Paper.js";
import { Button } from "../../mui/Button.js";
import { assertUnreachable } from "../../utils/index.js";

export function LoadingUriView({ error }: State.LoadingUriError): VNode {
  const { i18n } = useTranslationContext();
  return (
    <LoadingError
      title={<i18n.Translate>Could not load</i18n.Translate>}
      error={error}
    />
  );
}

export function SelectCurrencyView({
  currencies,
  onCurrencySelected,
}: State.SelectCurrency): VNode {
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
            list={currencies}
            name="lang"
            value={""}
            onChange={(v) => onCurrencySelected(v)}
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

const Container = styled.div`
  display: flex;
  flex-direction: column;
  & > * {
    margin: 8px;
  }
`;

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

export function ReadyView(props: State.Ready): VNode {
  switch (props.type) {
    case "get":
      return ReadyGetView(props);
    case "send":
      return ReadySendView(props);
    default:
      assertUnreachable(props.type);
  }
}
export function ReadyGetView({
  amountHandler,
  goToBank,
  goToWallet,
  selectCurrency,
  previous,
}: State.Ready): VNode {
  const { i18n } = useTranslationContext();

  return (
    <Container>
      <h1>
        <i18n.Translate>Specify the amount and the origin</i18n.Translate>
      </h1>
      <Grid container columns={2} justifyContent="space-between">
        <AmountField
          label={<i18n.Translate>Amount</i18n.Translate>}
          required
          handler={amountHandler}
        />
        <Button onClick={selectCurrency.onClick}>
          <i18n.Translate>Change currency</i18n.Translate>
        </Button>
      </Grid>

      <Grid container spacing={1} columns={1}>
        {previous.length > 0 ? (
          <Fragment>
            <p>
              <i18n.Translate>Use previous origins:</i18n.Translate>
            </p>
            <Grid item xs={1}>
              <Paper style={{ padding: 8 }}>
                <ContactTable>
                  {previous.map((info, i) => (
                    <tr key={i}>
                      <td>
                        <RowExample
                          info={info}
                          disabled={!amountHandler.onInput}
                        />
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
            <p>
              <i18n.Translate>
                Or specify the origin of the money
              </i18n.Translate>
            </p>
          </Grid>
        ) : (
          <Grid item>
            <p>
              <i18n.Translate>Specify the origin of the money</i18n.Translate>
            </p>
          </Grid>
        )}
        <Grid item container columns={2} spacing={1}>
          <Grid item xs={1}>
            <Paper style={{ padding: 8 }}>
              <p>
                <i18n.Translate>From my bank account</i18n.Translate>
              </p>
              <Button onClick={goToBank.onClick}>
                <i18n.Translate>Withdraw</i18n.Translate>
              </Button>
            </Paper>
          </Grid>
          <Grid item xs={1}>
            <Paper style={{ padding: 8 }}>
              <p>
                <i18n.Translate>From another wallet</i18n.Translate>
              </p>
              <Button onClick={goToWallet.onClick}>
                <i18n.Translate>Invoice</i18n.Translate>
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </Grid>
    </Container>
  );
}
export function ReadySendView({
  amountHandler,
  goToBank,
  goToWallet,
  previous,
}: State.Ready): VNode {
  const { i18n } = useTranslationContext();

  return (
    <Container>
      <h1>
        <i18n.Translate>Specify the amount and the destination</i18n.Translate>
      </h1>

      <div>
        <AmountField
          label={<i18n.Translate>Amount</i18n.Translate>}
          required
          handler={amountHandler}
        />
      </div>

      <Grid container spacing={1} columns={1}>
        {previous.length > 0 ? (
          <Fragment>
            <p>
              <i18n.Translate>Use previous destinations:</i18n.Translate>
            </p>
            <Grid item xs={1}>
              <Paper style={{ padding: 8 }}>
                <ContactTable>
                  {previous.map((info, i) => (
                    <tr key={i}>
                      <td>
                        <RowExample
                          info={info}
                          disabled={!amountHandler.onInput}
                        />
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
            <p>
              <i18n.Translate>
                Or specify the destination of the money
              </i18n.Translate>
            </p>
          </Grid>
        ) : (
          <Grid item>
            <p>
              <i18n.Translate>
                Specify the destination of the money
              </i18n.Translate>
            </p>
          </Grid>
        )}
        <Grid item container columns={2} spacing={1}>
          <Grid item xs={1}>
            <Paper style={{ padding: 8 }}>
              <p>
                <i18n.Translate>To my bank account</i18n.Translate>
              </p>
              <Button onClick={goToBank.onClick}>
                <i18n.Translate>Deposit</i18n.Translate>
              </Button>
            </Paper>
          </Grid>
          <Grid item xs={1}>
            <Paper style={{ padding: 8 }}>
              <p>
                <i18n.Translate>To another wallet</i18n.Translate>
              </p>
              <Button onClick={goToWallet.onClick}>
                <i18n.Translate>Send</i18n.Translate>
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </Grid>
    </Container>
  );
}
import bankIcon from "../../svg/ri-bank-line.svg";

function RowExample({
  info,
  disabled,
}: {
  info: Contact;
  disabled?: boolean;
}): VNode {
  const icon = info.icon_type === "bank" ? bankIcon : undefined;
  return (
    <MediaExample data-disabled={disabled}>
      <MediaLeft>
        <CircleDiv>
          {icon !== undefined ? (
            <SvgIcon
              title={info.name}
              dangerouslySetInnerHTML={{
                __html: icon,
              }}
              color="currentColor"
            />
          ) : (
            <span>A</span>
          )}
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
