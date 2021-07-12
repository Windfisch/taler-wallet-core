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
import { ProviderInfo, ProviderPaymentStatus, ProviderPaymentType } from "@gnu-taler/taler-wallet-core";
import { format, formatDuration, intervalToDuration } from "date-fns";
import { Fragment, VNode } from "preact";
import { ErrorMessage } from "../components/ErrorMessage";
import { Button, ButtonDestructive, ButtonPrimary, PaymentStatus, PopupBox } from "../components/styled";
import { useProviderStatus } from "../hooks/useProviderStatus";

interface Props {
  pid: string;
  onBack: () => void;
}

export function ProviderDetailPage({ pid, onBack }: Props): VNode {
  const status = useProviderStatus(pid)
  if (!status) {
    return <div>Loading...</div>
  }
  if (!status.info) {
    onBack()
    return <div />
  }
  return <ProviderView info={status.info}
    onSync={status.sync}
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
  function Error() {
    if (info?.lastError) {
      return <ErrorMessage title={info.lastError.hint} />
      // <div class="errorbox" style={{ marginTop: 10 }} >
      //   <div style={{ height: 0, textAlign: 'right', color: 'gray', fontSize: 'small' }}>last time tried {!info.lastAttemptedBackupTimestamp || info.lastAttemptedBackupTimestamp.t_ms === 'never' ? 'never' : format(new Date(info.lastAttemptedBackupTimestamp.t_ms), 'dd/MM/yyyy HH:mm:ss')}</div>
      //   <p>{info.lastError.hint}</p>
      // </div>
      // </Fragment>
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

  function colorByStatus(status: ProviderPaymentType) {
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
    }
  }

  function descriptionByStatus(status: ProviderPaymentStatus) {
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
    }
  }

  return (
    <PopupBox>
      <header>
        <PaymentStatus color={colorByStatus(info.paymentStatus.type)}>{info.paymentStatus.type}</PaymentStatus>

        {info.terms && <div>{info.terms.annualFee} / year</div>}
      </header>
      <section>
        <Error />
        <h3>{info.syncProviderBaseUrl}</h3>
        <p>{daysSince(info?.lastSuccessfulBackupTimestamp)} </p>
        <p>{descriptionByStatus(info.paymentStatus)}</p>
        {info.paymentStatus.type === ProviderPaymentType.TermsChanged && <div>
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
      <footer>
        <Button onClick={onBack}><i18n.Translate> &lt; back</i18n.Translate></Button>
        <div>
          <ButtonDestructive disabled onClick={onDelete}><i18n.Translate>remove</i18n.Translate></ButtonDestructive>
          <ButtonPrimary disabled onClick={onExtend}><i18n.Translate>extend</i18n.Translate></ButtonPrimary>
          <ButtonPrimary onClick={onSync}><i18n.Translate>sync now</i18n.Translate></ButtonPrimary>
        </div>
      </footer>
    </PopupBox>
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
