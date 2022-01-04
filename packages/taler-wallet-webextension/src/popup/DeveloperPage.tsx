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

import { NotificationType } from "@gnu-taler/taler-util";
import { PendingTaskInfo } from "@gnu-taler/taler-wallet-core";
import { format } from "date-fns";
import { Fragment, h, VNode } from "preact";
import { useState } from "preact/hooks";
import { Diagnostics } from "../components/Diagnostics";
import { NotifyUpdateFadeOut } from "../components/styled";
import { Time } from "../components/Time";
import { useAsyncAsHook } from "../hooks/useAsyncAsHook";
import { useDiagnostics } from "../hooks/useDiagnostics";
import * as wxApi from "../wxApi";

export function DeveloperPage(): VNode {
  const [status, timedOut] = useDiagnostics();

  const listenAllEvents = Array.from<NotificationType>({ length: 1 });
  listenAllEvents.includes = () => true; // includes every event
  const operationsResponse = useAsyncAsHook(
    wxApi.getPendingOperations,
    listenAllEvents,
  );

  const operations =
    operationsResponse === undefined
      ? []
      : operationsResponse.hasError
      ? []
      : operationsResponse.response.pendingOperations;

  return (
    <View
      status={status}
      timedOut={timedOut}
      operations={operations}
      onDownloadDatabase={async () => {
        const db = await wxApi.exportDB();
        return JSON.stringify(db);
      }}
    />
  );
}

export interface Props {
  status: any;
  timedOut: boolean;
  operations: PendingTaskInfo[];
  onDownloadDatabase: () => Promise<string>;
}

function hashObjectId(o: any): string {
  return JSON.stringify(o);
}

export function View({
  status,
  timedOut,
  operations,
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
  return (
    <div>
      <p>Debug tools:</p>
      <button onClick={openExtensionPage("/static/popup.html")}>
        wallet tab
      </button>

      <button onClick={confirmReset}>reset</button>
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
            click here
          </a>
          to download
        </div>
      )}
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
      url: chrome.extension.getURL(page),
    });
  };
}
