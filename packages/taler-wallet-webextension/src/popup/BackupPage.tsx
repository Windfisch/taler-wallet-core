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
import { ProviderInfo, ProviderPaymentStatus } from "@gnu-taler/taler-wallet-core";
import { differenceInMonths, formatDuration, intervalToDuration } from "date-fns";
import { FunctionalComponent, Fragment, JSX, VNode, AnyComponent } from "preact";
import {
  BoldLight, ButtonPrimary, ButtonSuccess, Centered,
  CenteredText, CenteredTextBold, PopupBox, Row,
  SmallText, SmallTextLight
} from "../components/styled";
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
  return <BackupView providers={status.providers} onAddProvider={onAddProvider} onSyncAll={status.sync} />;
}

export interface ViewProps {
  providers: ProviderInfo[],
  onAddProvider: () => void;
  onSyncAll: () => Promise<void>;
}

export function BackupView({ providers, onAddProvider, onSyncAll }: ViewProps): VNode {
  return (
    <PopupBox>
      <section>
        {providers.map((provider) => <BackupLayout
          status={provider.paymentStatus}
          timestamp={provider.lastSuccessfulBackupTimestamp}
          id={provider.syncProviderBaseUrl}
          active={provider.active}
          title={provider.syncProviderBaseUrl}
        />
        )}
        {!providers.length && <Centered style={{marginTop: 100}}>
          <BoldLight>No backup providers configured</BoldLight>
          <ButtonSuccess onClick={onAddProvider}><i18n.Translate>Add provider</i18n.Translate></ButtonSuccess>
        </Centered>}
      </section>
      {!!providers.length && <footer>
        <div />
        <div>
          <ButtonPrimary onClick={onSyncAll}>{
            providers.length > 1 ?
              <i18n.Translate>Sync all backups</i18n.Translate> :
              <i18n.Translate>Sync now</i18n.Translate>
          }</ButtonPrimary>
          <ButtonSuccess onClick={onAddProvider}>Add provider</ButtonSuccess>
        </div>
      </footer>}
    </PopupBox>
  )
}

interface TransactionLayoutProps {
  status: ProviderPaymentStatus;
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
    <Row>
      <div style={{ color: !props.active ? "grey" : undefined }}>
        <a href={Pages.provider_detail.replace(':pid', encodeURIComponent(props.id))}><span>{props.title}</span></a>

        {dateStr && <SmallText>Last synced: {dateStr}</SmallText>}
        {!dateStr && <SmallTextLight>Not synced</SmallTextLight>}
      </div>
      <div>
        {props.status?.type === 'paid' ?
          <ExpirationText until={props.status.paidUntil} /> :
          <div>{props.status.type}</div>
        }
      </div>
    </Row>
  );
}

function ExpirationText({ until }: { until: Timestamp }) {
  return <Fragment>
    <CenteredText> Expires in </CenteredText>
    <CenteredTextBold {...({ color: colorByTimeToExpire(until) })}> {daysUntil(until)} </CenteredTextBold>
  </Fragment>
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