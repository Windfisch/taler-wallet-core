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
import { Button, ButtonDestructive, ButtonPrimary, PaymentStatus, PopupBox, SmallTextLight } from "../components/styled";
import { useProviderStatus } from "../hooks/useProviderStatus";

interface Props {
  pid: string;
  onBack: () => void;
}

export function ProviderDetailPage({ pid, onBack }: Props): VNode {
  const status = useProviderStatus(pid)
  if (!status) {
    return <div><i18n.Translate>Loading...</i18n.Translate></div>
  }
  if (!status.info) {
    onBack()
    return <div />
  }
  return <ProviderView info={status.info}
    onSync={status.sync}
    onDelete={() => status.remove().then(onBack)}
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
  const lb = info?.lastSuccessfulBackupTimestamp
  const isPaid = info.paymentStatus.type === ProviderPaymentType.Paid || info.paymentStatus.type === ProviderPaymentType.TermsChanged
  return (
    <PopupBox>
      {info.backupProblem || info.lastError ? <header>
        <Error info={info} />
      </header> : undefined }
      <header>
        <h3>{info.name} <SmallTextLight>{info.syncProviderBaseUrl}</SmallTextLight></h3>
        <PaymentStatus color={isPaid ? 'rgb(28, 184, 65)' : 'rgb(202, 60, 60)'}>{isPaid ? 'Paid' : 'Unpaid'}</PaymentStatus>
      </header>
      <section>
        <p><b>Last backup:</b> {lb == null || lb.t_ms == "never" ? "never" : format(lb.t_ms, 'dd MMM yyyy')} </p>
        <ButtonPrimary onClick={onSync}><i18n.Translate>Back up</i18n.Translate></ButtonPrimary>
        {info.terms && <Fragment>
          <p><b>Provider fee:</b> {info.terms && info.terms.annualFee} per year</p>
        </Fragment>
        }
        <p>{descriptionByStatus(info.paymentStatus)}</p>
        <ButtonPrimary disabled onClick={onExtend}><i18n.Translate>Extend</i18n.Translate></ButtonPrimary>

        {info.paymentStatus.type === ProviderPaymentType.TermsChanged && <div>
          <p><i18n.Translate>terms has changed, extending the service will imply accepting the new terms of service</i18n.Translate></p>
          <table>
            <thead>
              <tr>
                <td></td>
                <td><i18n.Translate>old</i18n.Translate></td>
                <td> -&gt;</td>
                <td><i18n.Translate>new</i18n.Translate></td>
              </tr>
            </thead>
            <tbody>

              <tr>
                <td><i18n.Translate>fee</i18n.Translate></td>
                <td>{info.paymentStatus.oldTerms.annualFee}</td>
                <td>-&gt;</td>
                <td>{info.paymentStatus.newTerms.annualFee}</td>
              </tr>
              <tr>
                <td><i18n.Translate>storage</i18n.Translate></td>
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
          <ButtonDestructive onClick={onDelete}><i18n.Translate>remove provider</i18n.Translate></ButtonDestructive>
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
      duration?.years ? i18n.str`years` : (
        duration?.months ? i18n.str`months` : (
          duration?.days ? i18n.str`days` : (
            duration?.hours ? i18n.str`hours` : (
              duration?.minutes ? i18n.str`minutes` : i18n.str`seconds`
            )
          )
        )
      )
    ]
  })
  return `synced ${str} ago`
}

function Error({ info }: { info: ProviderInfo }) {
  if (info.lastError) {
    return <ErrorMessage title={info.lastError.hint} />
  }
  if (info.backupProblem) {
    switch (info.backupProblem.type) {
      case "backup-conflicting-device":
        return <ErrorMessage title={<Fragment>
          <i18n.Translate>There is conflict with another backup from <b>{info.backupProblem.otherDeviceId}</b></i18n.Translate>
        </Fragment>} />
      case "backup-unreadable":
        return <ErrorMessage title="Backup is not readable" />
      default:
        return <ErrorMessage title={<Fragment>
          <i18n.Translate>Unknown backup problem: {JSON.stringify(info.backupProblem)}</i18n.Translate>
        </Fragment>} />
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
    // return i18n.str`no enough balance to make the payment`
    // return i18n.str`not paid yet`
    case ProviderPaymentType.Paid:
    case ProviderPaymentType.TermsChanged:
      if (status.paidUntil.t_ms === 'never') {
        return i18n.str`service paid`
      } else {
        return <Fragment>
          <b>Backup valid until:</b> {format(status.paidUntil.t_ms, 'dd MMM yyyy')}
        </Fragment>
      }
    case ProviderPaymentType.Unpaid:
    case ProviderPaymentType.InsufficientBalance:
    case ProviderPaymentType.Pending:
      return ''
  }
}
