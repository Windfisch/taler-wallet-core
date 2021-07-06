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


import { BackupBackupProviderTerms, i18n, Timestamp } from "@gnu-taler/taler-util";
import { ProviderInfo, ProviderPaymentStatus, ProviderPaymentType } from "@gnu-taler/taler-wallet-core";
import { ContractTermsUtil } from "@gnu-taler/taler-wallet-core/src/util/contractTerms";
import { formatDuration, intervalToDuration, format } from "date-fns";
import { Fragment, VNode } from "preact";
import { useRef, useState } from "preact/hooks";
import { useBackupStatus } from "../hooks/useProvidersByCurrency";
import * as wxApi from "../wxApi";

interface Props {
  pid: string;
  onBack: () => void;
}

export function ProviderDetailPage({ pid, onBack }: Props): VNode {
  const status = useBackupStatus()
  if (!status) {
    return <div>Loading...</div>
  }
  const idx = parseInt(pid, 10)
  if (Number.isNaN(idx) || !(status.providers[idx])) {
    onBack()
    return <div />
  }
  const info = status.providers[idx];
  return <ProviderView info={info}
    onSync={() => { null }}
    onDelete={() => { null }}
    onBack={onBack}
    onExtend={() => { null }}
  />;
}

export interface ViewProps {
  info: ProviderInfo;
  onDelete: () => void;
  onSync: () => void;
  onBack: () => void;
  onExtend: () => void;
}

export function ProviderView({ info, onDelete, onSync, onBack, onExtend }: ViewProps): VNode {
  function Footer() {
    return <footer style={{ marginTop: 'auto', display: 'flex', flexShrink: 0 }}>
      <button class="pure-button" onClick={onBack}><i18n.Translate>back</i18n.Translate></button>
      <div style={{ width: '100%', flexDirection: 'row', justifyContent: 'flex-end', display: 'flex' }}>
        {info && <button class="pure-button button-destructive" disabled onClick={onDelete}><i18n.Translate>remove</i18n.Translate></button>}
        {info && <button class="pure-button button-secondary" disabled style={{ marginLeft: 5 }} onClick={onExtend}><i18n.Translate>extend</i18n.Translate></button>}
        {info && <button class="pure-button button-secondary" disabled style={{ marginLeft: 5 }} onClick={onSync}><i18n.Translate>sync now</i18n.Translate></button>}
      </div>
    </footer>
  }
  function Error() {
    if (info?.lastError) {
      return <Fragment>
        <div class="errorbox" style={{ marginTop: 10 }} >
          <div style={{ height: 0, textAlign: 'right', color: 'gray', fontSize: 'small' }}>last time tried {!info.lastAttemptedBackupTimestamp || info.lastAttemptedBackupTimestamp.t_ms === 'never' ? 'never' : format(new Date(info.lastAttemptedBackupTimestamp.t_ms), 'dd/MM/yyyy HH:mm:ss')}</div>
          <p>{info.lastError.hint}</p>
        </div>
      </Fragment>
    }
    if (info?.backupProblem) {
      switch (info.backupProblem.type) {
        case "backup-conflicting-device":
          return <div class="errorbox" style={{ marginTop: 10 }}>
            <p>There is conflict with another backup from <b>{info.backupProblem.otherDeviceId}</b></p>
          </div>
        case "backup-unreadable":
          return <div class="errorbox" style={{ marginTop: 10 }}>
            <p>Backup is not readable</p>
          </div>
        default:
          return <div class="errorbox" style={{ marginTop: 10 }}>
            <p>Unknown backup problem: {JSON.stringify(info.backupProblem)}</p>
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

  function descriptionByStatus(status: ProviderPaymentStatus | undefined) {
    if (!status) return ''
    switch (status.type) {
      case ProviderPaymentType.InsufficientBalance:
        return 'no enough balance to make the payment'
      case ProviderPaymentType.Unpaid:
        return 'not pay yet'
      case ProviderPaymentType.Paid:
      case ProviderPaymentType.TermsChanged:
        if (status.paidUntil.t_ms === 'never') {
          return 'service paid.'
        } else {
          return `service paid until ${format(status.paidUntil.t_ms, 'yyyy/MM/dd HH:mm:ss')}`
        }
      case ProviderPaymentType.Pending:
        return ''
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
        <section style={{ flex: '1 0 auto', height: 'calc(320px - 34px - 34px - 16px)', overflow: 'auto' }}>
          <span style={{ padding: 5, display: 'inline-block', backgroundColor: colorByStatus(info?.paymentStatus.type), borderRadius: 5, color: 'white' }}>{info?.paymentStatus.type}</span>
          {/* {info && <span style={{ float: "right", fontSize: "small", color: "gray", padding: 5 }}>
            From <b>{info.syncProviderBaseUrl}</b>
          </span>} */}
            {info && <div style={{ float: 'right', fontSize: "large", padding: 5 }}>{info.terms?.annualFee} / year</div>}

          <Error />

          <h3>{info?.syncProviderBaseUrl}</h3>
          <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", }}>
            <div>{daysSince(info?.lastSuccessfulBackupTimestamp)} </div>
          </div>

          <p>{descriptionByStatus(info?.paymentStatus)}</p>

          {info?.paymentStatus.type === ProviderPaymentType.TermsChanged && <div>
            <p>terms has changed, extending the service will imply accepting the new terms of service</p>
            <table>
              <thead>
                <tr>
                  <td></td>
                  <td>old</td>
                  <td> -&gt;</td>
                  <td>new</td>
                </tr>
              </thead>
              <tbody>

                <tr>
                  <td>fee</td>
                  <td>{info.paymentStatus.oldTerms.annualFee}</td>
                  <td>-&gt;</td>
                  <td>{info.paymentStatus.newTerms.annualFee}</td>
                </tr>
                <tr>
                  <td>storage</td>
                  <td>{info.paymentStatus.oldTerms.storageLimitInMegabytes}</td>
                  <td>-&gt;</td>
                  <td>{info.paymentStatus.newTerms.storageLimitInMegabytes}</td>
                </tr>
              </tbody>
            </table>
          </div>}

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
