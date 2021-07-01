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


import { Timestamp } from "@gnu-taler/taler-util";
import { formatDuration, intervalToDuration } from "date-fns";
import { JSX, VNode } from "preact";
import { ProvidersByCurrency, useBackupStatus } from "../hooks/useProvidersByCurrency";
import { Pages } from "./popup";

export function BackupPage(): VNode {
  const status = useBackupStatus()
  if (!status) {
    return <div>Loading...</div>
  }
  return <BackupView deviceName={status.deviceName} providers={status.providers}/>;
}

export interface ViewProps {
  deviceName: string;
  providers: ProvidersByCurrency
}

export function BackupView({ deviceName, providers }: ViewProps): VNode {
  return (
    <div style={{ height: 'calc(320px - 34px - 16px)', overflow: 'auto' }}>
      <div style={{ display: 'flex', flexDirection: 'row', width: '100%',  justifyContent: 'space-between' }}>
        <h2 style={{ width: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 10, marginBottom:10 }}>
          {deviceName}
        </h2>
        <div style={{ flexDirection: 'row', marginTop: 'auto', marginBottom: 'auto' }}>
          <button class="pure-button button-secondary">rename</button>
        </div>
      </div>
      {Object.keys(providers).map((currency) => {
        const provider = providers[currency]
        if (!provider) {
          return <BackupLayout
            id={currency}
            title={currency}
          />
        }
        return <BackupLayout
          status={provider.paymentStatus}
          timestamp={provider.lastSuccessfulBackupTimestamp}
          id={currency}
          active={provider.active}
          subtitle={provider.syncProviderBaseUrl}
          title={currency}
        />
      })}
    </div>
  )
}

interface TransactionLayoutProps {
  status?: any;
  timestamp?: Timestamp;
  title: string;
  id: string;
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
        {dateStr && <div style={{ fontSize: "small", color: "gray" }}>{dateStr}</div>}
        {!dateStr && <div style={{ fontSize: "small", color: "red" }}>never synced</div>}
        <div style={{ fontVariant: "small-caps", fontSize: "x-large" }}>
          <a href={Pages.provider.replace(':currency', props.id)}><span>{props.title}</span></a>
        </div>

        <div>{props.subtitle}</div>
      </div>
      <div style={{
        marginLeft: "auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        alignSelf: "center"
      }}>
        <div style={{}}>
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