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
  Balance,
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
import { useAsyncAsHook } from "../hooks/useAsyncAsHook";
import { useDiagnostics } from "../hooks/useDiagnostics";
import * as wxApi from "../wxApi";
import BalanceStories from "./Balance.stories";

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
      <p>Debug tools:</p>
      <button onClick={confirmReset}>reset</button>
      <br />
      <button onClick={() => fileRef?.current?.click()}>import database</button>
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
      <button onClick={onExportDatabase}>export database</button>
      {downloadedDatabase && (
        <div>
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
            {" "}
            click here{" "}
          </a>
          to download
        </div>
      )}
      <br />
      <p>Coins:</p>
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
          <p>Pending operations</p>
          <dl>
            {operations.reverse().map((o) => {
              return (
                <NotifyUpdateFadeOut key={hashObjectId(o)}>
                  <dt>{o.type}</dt>
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
  const [collapsedSpent, setCollapsedSpent] = useState(true);
  const [collapsedUnspent, setCollapsedUnspent] = useState(false);
  const total = coins.usable.reduce((prev, cur) => prev + cur.denom_value, 0);
  return (
    <Fragment>
      <p>
        <b>{ex}</b>: {total} {currencies[ex]}
      </p>
      <p>
        <b>usable coins</b>
      </p>
      {collapsedUnspent ? (
        <div onClick={() => setCollapsedUnspent(false)}>click to show</div>
      ) : (
        <table onClick={() => setCollapsedUnspent(true)}>
          <tr>
            <td>id</td>
            <td>denom</td>
            <td>value</td>
            <td>status</td>
            <td>from refresh?</td>
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
      <p>spent coins</p>
      {collapsedSpent ? (
        <div onClick={() => setCollapsedSpent(false)}>click to show</div>
      ) : (
        <table onClick={() => setCollapsedSpent(true)}>
          <tr>
            <td>id</td>
            <td>denom</td>
            <td>value</td>
            <td>status</td>
            <td>refresh?</td>
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

export function reload(): void {
  try {
    // eslint-disable-next-line no-undef
    chrome.runtime.reload();
    window.close();
  } catch (e) {
    // Functionality missing in firefox, ignore!
  }
}

function runIntegrationTest() {}

export async function confirmReset(): Promise<void> {
  if (
    confirm(
      "Do you want to IRREVOCABLY DESTROY everything inside your" +
        " wallet and LOSE ALL YOUR COINS?",
    )
  ) {
    await wxApi.resetDb();
    window.close();
  }
}

export function openExtensionPage(page: string) {
  return () => {
    // eslint-disable-next-line no-undef
    chrome.tabs.create({
      // eslint-disable-next-line no-undef
      url: chrome.runtime.getURL(page),
    });
  };
}
