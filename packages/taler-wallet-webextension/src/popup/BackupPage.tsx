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


import { i18n, Timestamp } from "@gnu-taler/taler-util";
import { ProviderInfo } from "@gnu-taler/taler-wallet-core";
import { formatDuration, intervalToDuration } from "date-fns";
import { JSX, VNode } from "preact";
import { useBackupStatus } from "../hooks/useProvidersByCurrency";
import { Pages } from "./popup";

interface Props {
  onAddProvider: () => void;
}

export function BackupPage({ onAddProvider }: Props): VNode {
  const status = useBackupStatus()
  if (!status) {
    return <div>Loading...</div>
  }
  return <BackupView providers={status.providers} onAddProvider={onAddProvider} />;
}

export interface ViewProps {
  providers: ProviderInfo[],
  onAddProvider: () => void;
}

export function BackupView({ providers, onAddProvider }: ViewProps): VNode {
  return (
    <div style={{ height: 'calc(320px - 34px - 16px)', overflow: 'auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <section style={{ flex: '1 0 auto', height: 'calc(320px - 34px - 34px - 16px)', overflow: 'auto' }}>

          {!!providers.length && <div>
            {providers.map((provider, idx) => {
              return <BackupLayout
                status={provider.paymentStatus}
                timestamp={provider.lastSuccessfulBackupTimestamp}
                id={idx}
                active={provider.active}
                subtitle={provider.syncProviderBaseUrl}
                title={provider.syncProviderBaseUrl}
              />
            })}
          </div>}
          {!providers.length && <div>
            There is not backup providers configured, add one with the button below
          </div>}

        </section>
        <footer style={{ marginTop: 'auto', display: 'flex', flexShrink: 0 }}>
          <div style={{ width: '100%', flexDirection: 'row', justifyContent: 'flex-end', display: 'flex' }}>
            <button class="pure-button button-secondary" disabled={!providers.length} style={{ marginLeft: 5 }} onClick={onAddProvider}>{
              providers.length > 1 ?
              <i18n.Translate>sync all now</i18n.Translate>:
              <i18n.Translate>sync now</i18n.Translate>
            }</button>
            <button class="pure-button button-success" style={{ marginLeft: 5 }} onClick={onAddProvider}><i18n.Translate>add provider</i18n.Translate></button>
          </div>
        </footer>
      </div>
    </div>
  )
}

interface TransactionLayoutProps {
  status?: any;
  timestamp?: Timestamp;
  title: string;
  id: number;
  subtitle?: string;
  active?: boolean;
}

function BackupLayout(props: TransactionLayoutProps): JSX.Element {
  const date = !props.timestamp ? undefined : new Date(props.timestamp.t_ms);
  const dateStr = date?.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  } as any);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        border: "1px solid gray",
        borderRadius: "0.5em",
        margin: "0.5em 0",
        justifyContent: "space-between",
        padding: "0.5em",
      }}
    >
      <div
        style={{ display: "flex", flexDirection: "column", color: !props.active ? "gray" : undefined }}
      >

        <div style={{ fontVariant: "small-caps", fontSize: "x-large" }}>
          <a href={Pages.provider_detail.replace(':pid', String(props.id))}><span>{props.title}</span></a>
        </div>

        {dateStr && <div style={{ fontSize: "small" }}>Last time synced: {dateStr}</div>}
        {!dateStr && <div style={{ fontSize: "small", color: "red" }}>never synced</div>}
      </div>
      <div style={{
        marginLeft: "auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        alignSelf: "center"
      }}>
        <div style={{ whiteSpace: 'nowrap' }}>
          {!props.status ? "missing" : (
            props.status?.type === 'paid' ? daysUntil(props.status.paidUntil) : 'unpaid'
          )}
        </div>
      </div>
    </div>
  );
}

function daysUntil(d: Timestamp) {
  if (d.t_ms === 'never') return undefined
  const duration = intervalToDuration({
    start: d.t_ms,
    end: new Date(),
  })
  const str = formatDuration(duration, {
    delimiter: ', ',
    format: [
      duration?.years ? 'years' : (
        duration?.months ? 'months' : (
          duration?.days ? 'days' : (
            duration.hours ? 'hours' : 'minutes'
          )
        )
      )
    ]
  })
  return `${str} left`
}