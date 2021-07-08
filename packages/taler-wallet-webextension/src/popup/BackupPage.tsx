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
import { differenceInMonths, formatDuration, intervalToDuration } from "date-fns";
import { Fragment, JSX, VNode } from "preact";
import { useBackupStatus } from "../hooks/useBackupStatus";
import { Pages } from "./popup";

interface Props {
  onAddProvider: () => void;
}

export function BackupPage({ onAddProvider }: Props): VNode {
  const status = useBackupStatus()
  if (!status) {
    return <div>Loading...</div>
  }
  return <BackupView providers={status.providers} onAddProvider={onAddProvider} onSyncAll={status.sync}/>;
}

export interface ViewProps {
  providers: ProviderInfo[],
  onAddProvider: () => void;
  onSyncAll: () => Promise<void>;
}

export function BackupView({ providers, onAddProvider, onSyncAll }: ViewProps): VNode {
  return (
    <div style={{ height: 'calc(320px - 34px - 16px)', overflow: 'auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <section style={{ flex: '1 0 auto', height: 'calc(320px - 34px - 34px - 16px)', overflow: 'auto' }}>

          {!!providers.length && <div>
            {providers.map((provider) => {
              return <BackupLayout
                status={provider.paymentStatus}
                timestamp={provider.lastSuccessfulBackupTimestamp}
                id={provider.syncProviderBaseUrl}
                active={provider.active}
                title={provider.syncProviderBaseUrl}
              />
            })}
          </div>}
          {!providers.length && <div style={{ color: 'gray', fontWeight: 'bold', marginTop: 80, textAlign: 'center' }}>
            <div>No backup providers configured</div>
            <button class="pure-button button-success" style={{ marginTop: 15 }} onClick={onAddProvider}><i18n.Translate>Add provider</i18n.Translate></button>
          </div>}

        </section>
        {!!providers.length && <footer style={{ marginTop: 'auto', display: 'flex', flexShrink: 0 }}>
          <div style={{ width: '100%', flexDirection: 'row', justifyContent: 'flex-end', display: 'flex' }}>
            <button class="pure-button button-secondary" style={{ marginLeft: 5 }} onClick={onSyncAll}>{
              providers.length > 1 ?
                <i18n.Translate>Sync all backups</i18n.Translate> :
                <i18n.Translate>Sync now</i18n.Translate>
            }</button>
            <button class="pure-button button-success" style={{ marginLeft: 5 }} onClick={onAddProvider}><i18n.Translate>Add provider</i18n.Translate></button>
          </div>
        </footer>}
      </div>
    </div>
  )
}

interface TransactionLayoutProps {
  status: any;
  timestamp?: Timestamp;
  title: string;
  id: string;
  active: boolean;
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
        <div style={{  }}>
          <a href={Pages.provider_detail.replace(':pid', encodeURIComponent(props.id))}><span>{props.title}</span></a>
        </div>

        {dateStr && <div style={{ fontSize: "small", marginTop: '0.5em' }}>Last synced: {dateStr}</div>}
        {!dateStr && <div style={{ fontSize: "small", color: 'gray' }}>Not synced</div>}
      </div>
      <div style={{
        marginLeft: "auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        alignSelf: "center"
      }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {
            props.status?.type === 'paid' ?
              <Fragment>
                <div style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                  Expires in
                </div>
                <div style={{ whiteSpace: 'nowrap', textAlign: 'center', fontWeight: 'bold', color: colorByTimeToExpire(props.status.paidUntil) }}>
                  {daysUntil(props.status.paidUntil)}
                </div>
              </Fragment>
              :
              'unpaid'
          }
        </div>
      </div>
    </div>
  );
}

function colorByTimeToExpire(d: Timestamp) {
  if (d.t_ms === 'never') return 'rgb(28, 184, 65)'
  const months = differenceInMonths(d.t_ms, new Date())
  return months > 1 ? 'rgb(28, 184, 65)' : 'rgb(223, 117, 20)';
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
  return `${str}`
}