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

import {
  AbsoluteTime,
  ExchangeListItem,
  TalerProtocolTimestamp,
} from "@gnu-taler/taler-util";
import { styled } from "@linaria/react";
import { Fragment, h, VNode } from "preact";
import { useState } from "preact/hooks";
import { Loading } from "../components/Loading.js";
import { LoadingError } from "../components/LoadingError.js";
import { SelectList } from "../components/SelectList.js";
import { Input, LinkPrimary } from "../components/styled/index.js";
import { Time } from "../components/Time.js";
import { useTranslationContext } from "../context/translation.js";
import { useAsyncAsHook } from "../hooks/useAsyncAsHook.js";
import { Button } from "../mui/Button.js";
import * as wxApi from "../wxApi.js";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  & > * {
    margin-bottom: 20px;
  }
`;

interface Props {
  initialValue?: number;
  exchanges: ExchangeListItem[];
  onSelected: (exchange: string) => void;
}

const ButtonGroup = styled.div`
  & > button {
    margin-left: 8px;
    margin-right: 8px;
  }
`;

export function ExchangeSelection(): VNode {
  const hook = useAsyncAsHook(wxApi.listExchanges);
  const { i18n } = useTranslationContext();
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
  return (
    <ExchangeSelectionView
      exchanges={hook.response.exchanges}
      onSelected={(exchange) => alert(`ok, selected: ${exchange}`)}
    />
  );
}

export function ExchangeSelectionView({
  initialValue,
  exchanges,
  onSelected,
}: Props): VNode {
  const list: Record<string, string> = {};
  exchanges.forEach((e, i) => (list[String(i)] = e.exchangeBaseUrl));

  const [value, setValue] = useState(String(initialValue || 0));
  const { i18n } = useTranslationContext();

  if (!exchanges.length) {
    return <div>no exchanges for listing, please add one</div>;
  }

  const current = exchanges[Number(value)];

  const hasChange = value !== current.exchangeBaseUrl;

  function nearestTimestamp(
    first: TalerProtocolTimestamp,
    second: TalerProtocolTimestamp,
  ): TalerProtocolTimestamp {
    const f = AbsoluteTime.fromTimestamp(first);
    const s = AbsoluteTime.fromTimestamp(second);
    const a = AbsoluteTime.min(f, s);
    return AbsoluteTime.toTimestamp(a);
  }

  let nextFeeUpdate = TalerProtocolTimestamp.never();

  nextFeeUpdate = Object.values(current.wireInfo.feesForType).reduce(
    (prev, cur) => {
      return cur.reduce((p, c) => nearestTimestamp(p, c.endStamp), prev);
    },
    nextFeeUpdate,
  );

  nextFeeUpdate = current.denominations.reduce((prev, cur) => {
    return [
      cur.stampExpireWithdraw,
      cur.stampExpireLegal,
      cur.stampExpireDeposit,
    ].reduce(nearestTimestamp, prev);
  }, nextFeeUpdate);

  return (
    <Container>
      <h2>
        <i18n.Translate>Service fee description</i18n.Translate>
      </h2>

      <section>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <p>
            <Input>
              <SelectList
                label={<i18n.Translate>Known exchanges</i18n.Translate>}
                list={list}
                name="lang"
                value={value}
                onChange={(v) => setValue(v)}
              />
            </Input>
          </p>
          {hasChange ? (
            <ButtonGroup>
              <Button
                variant="outlined"
                onClick={async () => {
                  setValue(current.exchangeBaseUrl);
                }}
              >
                Reset
              </Button>
              <Button
                variant="contained"
                onClick={async () => {
                  onSelected(value);
                }}
              >
                Use this exchange
              </Button>
            </ButtonGroup>
          ) : (
            <Button
              variant="outlined"
              onClick={async () => {
                null;
              }}
            >
              Close
            </Button>
          )}
        </div>
      </section>
      <section>
        <dl>
          <dt>Auditors</dt>
          {current.auditors.map((a) => {
            <dd>{a.auditor_url}</dd>;
          })}
        </dl>
        <table>
          <tr>
            <td>currency</td>
            <td>{current.currency}</td>
          </tr>
          <tr>
            <td>next fee update</td>
            <td>
              {
                <Time
                  timestamp={AbsoluteTime.fromTimestamp(nextFeeUpdate)}
                  format="dd MMMM yyyy, HH:mm"
                />
              }
            </td>
          </tr>
        </table>
      </section>
      <section>
        <table>
          <thead>
            <tr>
              <td>Denomination operations</td>
              <td>Current fee</td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={2}>deposit (i)</td>
            </tr>

            <tr>
              <td>* 10</td>
              <td>0.1</td>
            </tr>
            <tr>
              <td>* 5</td>
              <td>0.05</td>
            </tr>
            <tr>
              <td>* 1</td>
              <td>0.01</td>
            </tr>
          </tbody>
        </table>
      </section>
      <section>
        <table>
          <thead>
            <tr>
              <td>Wallet operations</td>
              <td>Current fee</td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>history(i) </td>
              <td>0.1</td>
            </tr>
            <tr>
              <td>kyc (i) </td>
              <td>0.1</td>
            </tr>
            <tr>
              <td>account (i) </td>
              <td>0.1</td>
            </tr>
            <tr>
              <td>purse (i) </td>
              <td>0.1</td>
            </tr>
            <tr>
              <td>wire SEPA (i) </td>
              <td>0.1</td>
            </tr>
            <tr>
              <td>closing SEPA(i) </td>
              <td>0.1</td>
            </tr>
            <tr>
              <td>wad SEPA (i) </td>
              <td>0.1</td>
            </tr>
          </tbody>
        </table>
      </section>
      <section>
        <ButtonGroup>
          <LinkPrimary>Privacy policy</LinkPrimary>
          <LinkPrimary>Terms of service</LinkPrimary>
        </ButtonGroup>
      </section>
    </Container>
  );
}
