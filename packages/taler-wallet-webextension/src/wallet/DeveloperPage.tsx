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
  Amounts,
  CoinDumpJson,
  CoinStatus,
  ExchangeListItem,
  NotificationType,
} from "@gnu-taler/taler-util";
import { PendingTaskInfo } from "@gnu-taler/taler-wallet-core";
import { format } from "date-fns";
import { Fragment, h, VNode } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { Diagnostics } from "../components/Diagnostics.js";
import { NotifyUpdateFadeOut } from "../components/styled/index.js";
import { Time } from "../components/Time.js";
import { useTranslationContext } from "../context/translation.js";
import { useAsyncAsHook } from "../hooks/useAsyncAsHook.js";
import { useDiagnostics } from "../hooks/useDiagnostics.js";
import { Button } from "../mui/Button.js";
import { Grid } from "../mui/Grid.js";
import { Paper } from "../mui/Paper.js";
import * as wxApi from "../wxApi.js";

export function DeveloperPage(): VNode {
  const [status, timedOut] = useDiagnostics();

  const listenAllEvents = Array.from<NotificationType>({ length: 1 });
  //FIXME: waiting for retry notification make a always increasing loop of notifications
  listenAllEvents.includes = (e) => e !== "waiting-for-retry"; // includes every event

  const response = useAsyncAsHook(async () => {
    const op = await wxApi.getPendingOperations();
    const c = await wxApi.dumpCoins();
    const ex = await wxApi.listExchanges();
    return {
      operations: op.pendingOperations,
      coins: c.coins,
      exchanges: ex.exchanges,
    };
  });

  useEffect(() => {
    return wxApi.onUpdateNotification(listenAllEvents, () => {
      response?.retry();
    });
  });

  const nonResponse = { operations: [], coins: [], exchanges: [] };
  const { operations, coins, exchanges } =
    response === undefined
      ? nonResponse
      : response.hasError
      ? nonResponse
      : response.response;

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
  ageKeysCount: number | undefined;
  denom_value: number;
  //remain_value: number;
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
        ageKeysCount: cur.ageCommitmentProof?.proof.privateKeys.length,
        denom_value: parseFloat(Amounts.stringifyValue(denom)),
        // remain_value: parseFloat(
        //   Amounts.stringifyValue(Amounts.parseOrThrow(cur.remaining_value)),
        // ),
        status: cur.coin_status,
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
      <Grid container justifyContent="space-between" spacing={1}>
        <Grid item>
          <Button
            variant="contained"
            onClick={() =>
              confirmReset(
                i18n.str`Do you want to IRREVOCABLY DESTROY everything inside your wallet and LOSE ALL YOUR COINS?`,
                wxApi.resetDb,
              )
            }
          >
            <i18n.Translate>reset</i18n.Translate>
          </Button>
        </Grid>
        <Grid item>
          <Button
            variant="contained"
            onClick={() =>
              confirmReset(
                i18n.str`TESTING: This may delete all your coin, proceed with caution`,
                wxApi.runGarbageCollector,
              )
            }
          >
            <i18n.Translate>run gc</i18n.Translate>
          </Button>
        </Grid>
        <Grid item>
          <Button
            variant="contained"
            onClick={async () => fileRef?.current?.click()}
          >
            <i18n.Translate>import database</i18n.Translate>
          </Button>
        </Grid>
        <Grid item>
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
          <Button variant="contained" onClick={onExportDatabase}>
            <i18n.Translate>export database</i18n.Translate>
          </Button>
        </Grid>
      </Grid>
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
      {Object.keys(money_by_exchange).map((ex, idx) => {
        const allcoins = money_by_exchange[ex];
        allcoins.sort((a, b) => {
          return b.denom_value - a.denom_value;
        });

        const coins = allcoins.reduce(
          (prev, cur) => {
            if (cur.status === CoinStatus.Fresh) prev.usable.push(cur);
            if (cur.status === CoinStatus.Dormant) prev.spent.push(cur);
            return prev;
          },
          {
            spent: [],
            usable: [],
          } as SplitedCoinInfo,
        );

        return (
          <ShowAllCoins
            key={idx}
            coins={coins}
            ex={ex}
            currencies={currencies}
          />
        );
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
                      format="yy/MM/dd HH:mm:ss"
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
}): VNode {
  const { i18n } = useTranslationContext();
  const [collapsedSpent, setCollapsedSpent] = useState(true);
  const [collapsedUnspent, setCollapsedUnspent] = useState(false);
  const total = coins.usable.reduce((prev, cur) => prev + cur.denom_value, 0);
  return (
    <Fragment>
      <p>
        <b>{ex}</b>: {total} {currencies[ex]}
      </p>
      <p onClick={() => setCollapsedUnspent(true)}>
        <b>
          <i18n.Translate>usable coins</i18n.Translate>
        </b>
      </p>
      {collapsedUnspent ? (
        <div onClick={() => setCollapsedUnspent(false)}>click to show</div>
      ) : (
        <table>
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
            <td>
              <i18n.Translate>age key count</i18n.Translate>
            </td>
          </tr>
          {coins.usable.map((c, idx) => {
            return (
              <tr key={idx}>
                <td>{c.id.substring(0, 5)}</td>
                <td>{c.denom_value}</td>
                <td>{c.status}</td>
                <td>{c.from_refresh ? "true" : "false"}</td>
                <td>{String(c.ageKeysCount)}</td>
              </tr>
            );
          })}
        </table>
      )}
      <p onClick={() => setCollapsedSpent(true)}>
        <i18n.Translate>spent coins</i18n.Translate>
      </p>
      {collapsedSpent ? (
        <div onClick={() => setCollapsedSpent(false)}>
          <i18n.Translate>click to show</i18n.Translate>
        </div>
      ) : (
        <table>
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
          {coins.spent.map((c, idx) => {
            return (
              <tr key={idx}>
                <td>{c.id.substring(0, 5)}</td>
                <td>{c.denom_value}</td>
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

export async function confirmReset(
  confirmTheResetMessage: string,
  cb: () => Promise<void>,
): Promise<void> {
  if (confirm(confirmTheResetMessage)) {
    await cb();
    window.close();
  }
}
