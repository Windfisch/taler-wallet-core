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
import { ProviderInfo, ProviderPaymentType } from "@gnu-taler/taler-wallet-core";
import { formatDuration, intervalToDuration } from "date-fns";
import { VNode } from "preact";
import { useRef, useState } from "preact/hooks";
import { useBackupStatus } from "../hooks/useProvidersByCurrency";
import * as wxApi from "../wxApi";

interface Props {
  currency: string;
}

export function ProviderPage({ currency }: Props): VNode {
  const status = useBackupStatus()
  const [adding, setAdding] = useState<boolean>(false)
  if (!status) {
    return <div>Loading...</div>
  }
  if (adding) {
    return <AddProviderView onConfirm={(value) => {
      console.log(value)
      wxApi.addBackupProvider(value).then(_ => history.go(-1))
      setAdding(false)
    }} />
  }
  const info = status.providers[currency];
  return <ProviderView currency={currency} info={info}
    onSync={() => { null }}
    onDelete={() => { null }}
    onBack={() => { history.go(-1); }}
    onAddProvider={() => { setAdding(true) }}
  />;
}

function AddProviderView({ onConfirm }: { onConfirm: (s: string) => void }) {
  const textInput = useRef<HTMLInputElement>(null)
  return <div>
    <input ref={textInput} />
    <button onClick={() => onConfirm(textInput?.current.value)}>confirm</button>
  </div>
}

export interface ViewProps {
  currency: string;
  info?: ProviderInfo;
  onDelete: () => void;
  onSync: () => void;
  onBack: () => void;
  onAddProvider: () => void;
}

export function ProviderView({ currency, info, onDelete, onSync, onBack, onAddProvider }: ViewProps): VNode {
  function Footer() {
    return <footer style={{ marginTop: 'auto', display: 'flex', flexShrink: 0 }}>
      <button onClick={onBack}><i18n.Translate>back</i18n.Translate></button>
      <div style={{ width: '100%', flexDirection: 'row', justifyContent: 'flex-end', display: 'flex' }}>
        {info && <button class="pure-button button-destructive" onClick={onDelete}><i18n.Translate>remove</i18n.Translate></button>}
        {info && <button class="pure-button button-secondary" style={{ marginLeft: 5 }} onClick={onSync}><i18n.Translate>sync now</i18n.Translate></button>}
        {!info && <button class="pure-button button-success" style={{ marginLeft: 5 }} onClick={onAddProvider}><i18n.Translate>add provider</i18n.Translate></button>}
      </div>
    </footer>
  }
  function Error() {
    if (info?.lastError) {
      return <div class="errorbox" style={{ marginTop: 10 }} >
        <p>{info.lastError.hint}</p>
      </div>
    }
    if (info?.backupProblem) {
      switch (info.backupProblem.type) {
        case "backup-conflicting-device":
          return <div class="errorbox" style={{ marginTop: 10 }}>
            <p>There is another backup from <b>{info.backupProblem.otherDeviceId}</b></p>
          </div>
        case "backup-unreadable":
          return <div class="errorbox" style={{ marginTop: 10 }}>
            <p>Backup is not readable</p>
          </div>
        default:
          return <div class="errorbox" style={{ marginTop: 10 }}>
            <p>Unkown backup problem: {JSON.stringify(info.backupProblem)}</p>
          </div>
      }
    }
    return null
  }
  function colorByStatus(status: ProviderPaymentType | undefined) {
    switch (status) {
      case ProviderPaymentType.InsufficientBalance:
        return 'rgb(223, 117, 20)'
      case ProviderPaymentType.Unpaid:
        return 'rgb(202, 60, 60)'
      case ProviderPaymentType.Paid:
        return 'rgb(28, 184, 65)'
      case ProviderPaymentType.Pending:
        return 'gray'
      case ProviderPaymentType.InsufficientBalance:
        return 'rgb(202, 60, 60)'
      case ProviderPaymentType.TermsChanged:
        return 'rgb(202, 60, 60)'
      default:
        break;
    }
    return undefined
  }

  return (
    <div style={{ height: 'calc(320px - 34px - 16px)', overflow: 'auto' }}>
      <style>{`
      table td {
        padding: 5px 10px;
      }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <section style={{ flex: '1 0 auto', height: 'calc(320px - 34px - 45px - 16px)', overflow: 'auto' }}>
          <span style={{ padding: 5, display: 'inline-block', backgroundColor: colorByStatus(info?.paymentStatus.type), borderRadius: 5, color: 'white' }}>{info?.paymentStatus.type}</span>
          {info && <span style={{ float: "right", fontSize: "small", color: "gray", padding: 5 }}>
            From <b>{info.syncProviderBaseUrl}</b>
          </span>}

          <Error />

          <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", }}>
            <h1>{currency}</h1>
            {info && <div style={{ marginTop: 'auto', marginBottom: 'auto' }}>{info.terms?.annualFee} / year</div>}
          </div>

          <div>{daysSince(info?.lastSuccessfulBackupTimestamp)} </div>
        </section>
        <Footer />
      </div>
    </div>
  )
}

function daysSince(d?: Timestamp) {
  if (!d || d.t_ms === 'never') return 'never synced'
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
            duration?.hours ? 'hours' : (
              duration?.minutes ? 'minutes' : 'seconds'
            )
          )
        )
      )
    ]
  })
  return `synced ${str} ago`
}
