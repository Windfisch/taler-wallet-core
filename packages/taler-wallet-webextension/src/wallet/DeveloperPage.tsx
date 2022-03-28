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

import {
  Amounts,
  CoinDumpJson,
  ExchangeListItem,
  NotificationType,
} from "@gnu-taler/taler-util";
import { PendingTaskInfo } from "@gnu-taler/taler-wallet-core";
import { format } from "date-fns";
import { Fragment, h, VNode } from "preact";
import { useRef, useState } from "preact/hooks";
import { Diagnostics } from "../components/Diagnostics";
import { NotifyUpdateFadeOut } from "../components/styled";
import { Time } from "../components/Time";
import { useTranslationContext } from "../context/translation";
import { useAsyncAsHook } from "../hooks/useAsyncAsHook";
import { useDiagnostics } from "../hooks/useDiagnostics";
import * as wxApi from "../wxApi";

export function DeveloperPage(): VNode {
  const [status, timedOut] = useDiagnostics();

  const listenAllEvents = Array.from<NotificationType>({ length: 1 });
  listenAllEvents.includes = () => true; // includes every event

  const response = useAsyncAsHook(async () => {
    const op = await wxApi.getPendingOperations();
    const c = await wxApi.dumpCoins();
    const ex = await wxApi.listExchanges();
    return {
      operations: op.pendingOperations,
      coins: c.coins,
      exchanges: ex.exchanges,
    };
  }, listenAllEvents);

  const nonResponse = { operations: [], coins: [], exchanges: [] };
  const { operations, coins, exchanges } =
    response === undefined
      ? nonResponse
      : response.hasError
      ? nonResponse
      : response.response;

  const balanceResponse = useAsyncAsHook(wxApi.getBalance);

  return (
    <View
      status={status}
      timedOut={timedOut}
      operations={operations}
      coins={coins}
      exchanges={exchanges}
      onDownloadDatabase={async () => {
        const db = await wxApi.exportDB();
        return JSON.stringify(db);
      }}
    />
  );
}

type CoinsInfo = CoinDumpJson["coins"];
type CalculatedCoinfInfo = {
  denom_value: number;
  remain_value: number;
  status: string;
  from_refresh: boolean;
  id: string;
};

type SplitedCoinInfo = {
  spent: CalculatedCoinfInfo[];
  usable: CalculatedCoinfInfo[];
};

export interface Props {
  status: any;
  timedOut: boolean;
  operations: PendingTaskInfo[];
  coins: CoinsInfo;
  exchanges: ExchangeListItem[];
  onDownloadDatabase: () => Promise<string>;
}

function hashObjectId(o: any): string {
  return JSON.stringify(o);
}

export function View({
  status,
  timedOut,
  operations,
  coins,
  onDownloadDatabase,
}: Props): VNode {
  const { i18n } = useTranslationContext();
  const [downloadedDatabase, setDownloadedDatabase] = useState<
    { time: Date; content: string } | undefined
  >(undefined);
  async function onExportDatabase(): Promise<void> {
    const content = await onDownloadDatabase();
    setDownloadedDatabase({
      time: new Date(),
      content,
    });
  }
  const fileRef = useRef<HTMLInputElement>(null);
  async function onImportDatabase(str: string): Promise<void> {
    return wxApi.importDB(JSON.parse(str));
  }
  const currencies: { [ex: string]: string } = {};
  const money_by_exchange = coins.reduce(
    (prev, cur) => {
      const denom = Amounts.parseOrThrow(cur.denom_value);
      if (!prev[cur.exchange_base_url]) {
        prev[cur.exchange_base_url] = [];
        currencies[cur.exchange_base_url] = denom.currency;
      }
      prev[cur.exchange_base_url].push({
        denom_value: parseFloat(Amounts.stringifyValue(denom)),
        remain_value: parseFloat(
          Amounts.stringifyValue(Amounts.parseOrThrow(cur.remaining_value)),
        ),
        status: cur.coin_suspended ? "suspended" : "ok",
        from_refresh: cur.refresh_parent_coin_pub !== undefined,
        id: cur.coin_pub,
      });
      return prev;
    },
    {} as {
      [exchange_name: string]: CalculatedCoinfInfo[];
    },
  );

  return (
    <div>
      <p>
        <i18n.Translate>Debug tools</i18n.Translate>:
      </p>
      <button
        onClick={() =>
          confirmReset(
            i18n.str`Do you want to IRREVOCABLY DESTROY everything inside your wallet and LOSE ALL YOUR COINS?`,
          )
        }
      >
        <i18n.Translate>reset</i18n.Translate>
      </button>
      <br />
      <button onClick={() => fileRef?.current?.click()}>
        <i18n.Translate>import database</i18n.Translate>
      </button>
      <input
        ref={fileRef}
        style={{ display: "none" }}
        type="file"
        onChange={async (e) => {
          const f: FileList | null = e.currentTarget.files;
          if (!f || f.length != 1) {
            return Promise.reject();
          }
          const buf = await f[0].arrayBuffer();
          const str = new Uint8Array(buf).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            "",
          );
          return onImportDatabase(str);
        }}
      />
      <br />
      <button onClick={onExportDatabase}>
        <i18n.Translate>export database</i18n.Translate>
      </button>
      {downloadedDatabase && (
        <div>
          <i18n.Translate>
            Database exported at
            <Time
              timestamp={{ t_ms: downloadedDatabase.time.getTime() }}
              format="yyyy/MM/dd HH:mm:ss"
            />
            <a
              href={`data:text/plain;charset=utf-8;base64,${toBase64(
                downloadedDatabase.content,
              )}`}
              download={`taler-wallet-database-${format(
                downloadedDatabase.time,
                "yyyy/MM/dd_HH:mm",
              )}.json`}
            >
              <i18n.Translate>click here</i18n.Translate>
            </a>
            to download
          </i18n.Translate>
        </div>
      )}
      <br />
      <p>
        <i18n.Translate>Coins</i18n.Translate>:
      </p>
      {Object.keys(money_by_exchange).map((ex) => {
        const allcoins = money_by_exchange[ex];
        allcoins.sort((a, b) => {
          return b.denom_value - a.denom_value;
        });

        const coins = allcoins.reduce(
          (prev, cur) => {
            if (cur.remain_value > 0) prev.usable.push(cur);
            if (cur.remain_value === 0) prev.spent.push(cur);
            return prev;
          },
          {
            spent: [],
            usable: [],
          } as SplitedCoinInfo,
        );

        return <ShowAllCoins coins={coins} ex={ex} currencies={currencies} />;
      })}
      <br />
      <Diagnostics diagnostics={status} timedOut={timedOut} />
      {operations && operations.length > 0 && (
        <Fragment>
          <p>
            <i18n.Translate>Pending operations</i18n.Translate>
          </p>
          <dl>
            {operations.reverse().map((o) => {
              return (
                <NotifyUpdateFadeOut key={hashObjectId(o)}>
                  <dt>
                    {o.type}{" "}
                    <Time
                      timestamp={o.timestampDue}
                      format="yy/MM/dd hh:mm:ss"
                    />
                  </dt>
                  <dd>
                    <pre>{JSON.stringify(o, undefined, 2)}</pre>
                  </dd>
                </NotifyUpdateFadeOut>
              );
            })}
          </dl>
        </Fragment>
      )}
    </div>
  );
}

function ShowAllCoins({
  ex,
  coins,
  currencies,
}: {
  ex: string;
  coins: SplitedCoinInfo;
  currencies: { [ex: string]: string };
}) {
  const { i18n } = useTranslationContext();
  const [collapsedSpent, setCollapsedSpent] = useState(true);
  const [collapsedUnspent, setCollapsedUnspent] = useState(false);
  const total = coins.usable.reduce((prev, cur) => prev + cur.denom_value, 0);
  return (
    <Fragment>
      <p>
        <b>{ex}</b>: {total} {currencies[ex]}
      </p>
      <p>
        <b>
          <i18n.Translate>usable coins</i18n.Translate>
        </b>
      </p>
      {collapsedUnspent ? (
        <div onClick={() => setCollapsedUnspent(false)}>click to show</div>
      ) : (
        <table onClick={() => setCollapsedUnspent(true)}>
          <tr>
            <td>
              <i18n.Translate>id</i18n.Translate>
            </td>
            <td>
              <i18n.Translate>denom</i18n.Translate>
            </td>
            <td>
              <i18n.Translate>value</i18n.Translate>
            </td>
            <td>
              <i18n.Translate>status</i18n.Translate>
            </td>
            <td>
              <i18n.Translate>from refresh?</i18n.Translate>
            </td>
          </tr>
          {coins.usable.map((c) => {
            return (
              <tr>
                <td>{c.id.substring(0, 5)}</td>
                <td>{c.denom_value}</td>
                <td>{c.remain_value}</td>
                <td>{c.status}</td>
                <td>{c.from_refresh ? "true" : "false"}</td>
              </tr>
            );
          })}
        </table>
      )}
      <p>
        <i18n.Translate>spent coins</i18n.Translate>
      </p>
      {collapsedSpent ? (
        <div onClick={() => setCollapsedSpent(false)}>
          <i18n.Translate>click to show</i18n.Translate>
        </div>
      ) : (
        <table onClick={() => setCollapsedSpent(true)}>
          <tr>
            <td>
              <i18n.Translate>id</i18n.Translate>
            </td>
            <td>
              <i18n.Translate>denom</i18n.Translate>
            </td>
            <td>
              <i18n.Translate>value</i18n.Translate>
            </td>
            <td>
              <i18n.Translate>status</i18n.Translate>
            </td>
            <td>
              <i18n.Translate>from refresh?</i18n.Translate>
            </td>
          </tr>
          {coins.spent.map((c) => {
            return (
              <tr>
                <td>{c.id.substring(0, 5)}</td>
                <td>{c.denom_value}</td>
                <td>{c.remain_value}</td>
                <td>{c.status}</td>
                <td>{c.from_refresh ? "true" : "false"}</td>
              </tr>
            );
          })}
        </table>
      )}
    </Fragment>
  );
}

function toBase64(str: string): string {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (match, p1) {
      return String.fromCharCode(parseInt(p1, 16));
    }),
  );
}

function runIntegrationTest() {}

export async function confirmReset(
  confirmTheResetMessage: string,
): Promise<void> {
  if (confirm(confirmTheResetMessage)) {
    await wxApi.resetDb();
    window.close();
  }
}
