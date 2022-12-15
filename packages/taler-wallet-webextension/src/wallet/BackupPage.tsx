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

import { AbsoluteTime, constructRecoveryUri } from "@gnu-taler/taler-util";
import {
  ProviderInfo,
  ProviderPaymentPaid,
  ProviderPaymentStatus,
  ProviderPaymentType,
  WalletApiOperation,
} from "@gnu-taler/taler-wallet-core";
import {
  differenceInMonths,
  formatDuration,
  intervalToDuration,
} from "date-fns";
import { Fragment, h, VNode } from "preact";
import { useEffect, useState } from "preact/hooks";
import { Loading } from "../components/Loading.js";
import { LoadingError } from "../components/LoadingError.js";
import { QR } from "../components/QR.js";
import {
  BoldLight,
  Centered,
  CenteredBoldText,
  CenteredText,
  RowBorderGray,
  SmallLightText,
  SmallText,
  WarningBox,
} from "../components/styled/index.js";
import { useBackendContext } from "../context/backend.js";
import { useTranslationContext } from "../context/translation.js";
import { useAsyncAsHook } from "../hooks/useAsyncAsHook.js";
import { Button } from "../mui/Button.js";
import { Pages } from "../NavigationBar.js";

interface Props {
  onAddProvider: () => Promise<void>;
}

export function ShowRecoveryInfo({
  info,
  onClose,
}: {
  info: string;
  onClose: () => Promise<void>;
}): VNode {
  const [display, setDisplay] = useState(false);
  const [copied, setCopied] = useState(false);
  async function copyText(): Promise<void> {
    navigator.clipboard.writeText(info);
    setCopied(true);
  }
  useEffect(() => {
    if (copied) {
      setTimeout(() => {
        setCopied(false);
      }, 1000);
    }
  }, [copied]);
  return (
    <Fragment>
      <h2>Wallet Recovery</h2>
      <WarningBox>Do not share this QR or URI with anyone</WarningBox>
      <section>
        <p>
          The qr code can be scanned by another wallet to keep synchronized with
          this wallet.
        </p>
        <Button variant="contained" onClick={async () => setDisplay((d) => !d)}>
          {display ? "Hide" : "Show"} QR code
        </Button>
        {display && <QR text={JSON.stringify(info)} />}
      </section>

      <section>
        <p>You can also use the string version</p>
        <Button variant="contained" disabled={copied} onClick={copyText}>
          Copy recovery URI
        </Button>
      </section>
      <footer>
        <div></div>
        <div>
          <Button variant="contained" onClick={onClose}>
            Close
          </Button>
        </div>
      </footer>
    </Fragment>
  );
}

export function BackupPage({ onAddProvider }: Props): VNode {
  const { i18n } = useTranslationContext();
  const api = useBackendContext();
  const status = useAsyncAsHook(() =>
    api.wallet.call(WalletApiOperation.GetBackupInfo, {}),
  );
  const [recoveryInfo, setRecoveryInfo] = useState<string>("");
  if (!status) {
    return <Loading />;
  }
  if (status.hasError) {
    return (
      <LoadingError
        title={<i18n.Translate>Could not load backup providers</i18n.Translate>}
        error={status}
      />
    );
  }

  async function getRecoveryInfo(): Promise<void> {
    const r = await api.wallet.call(
      WalletApiOperation.ExportBackupRecovery,
      {},
    );
    const str = constructRecoveryUri(r);
    setRecoveryInfo(str);
  }

  const providers = status.response.providers.sort((a, b) => {
    if (
      a.paymentStatus.type === ProviderPaymentType.Paid &&
      b.paymentStatus.type === ProviderPaymentType.Paid
    ) {
      return getStatusPaidOrder(a.paymentStatus, b.paymentStatus);
    }
    return (
      getStatusTypeOrder(a.paymentStatus) - getStatusTypeOrder(b.paymentStatus)
    );
  });

  if (recoveryInfo) {
    return (
      <ShowRecoveryInfo
        info={recoveryInfo}
        onClose={async () => setRecoveryInfo("")}
      />
    );
  }

  return (
    <BackupView
      providers={providers}
      onAddProvider={onAddProvider}
      onSyncAll={async () =>
        api.wallet.call(WalletApiOperation.RunBackupCycle, {}).then()
      }
      onShowInfo={getRecoveryInfo}
    />
  );
}

export interface ViewProps {
  providers: ProviderInfo[];
  onAddProvider: () => Promise<void>;
  onSyncAll: () => Promise<void>;
  onShowInfo: () => Promise<void>;
}

export function BackupView({
  providers,
  onAddProvider,
  onSyncAll,
  onShowInfo,
}: ViewProps): VNode {
  const { i18n } = useTranslationContext();
  return (
    <Fragment>
      <section>
        {providers.map((provider, idx) => (
          <BackupLayout
            key={idx}
            status={provider.paymentStatus}
            timestamp={
              provider.lastSuccessfulBackupTimestamp
                ? AbsoluteTime.fromTimestamp(
                    provider.lastSuccessfulBackupTimestamp,
                  )
                : undefined
            }
            id={provider.syncProviderBaseUrl}
            active={provider.active}
            title={provider.name}
          />
        ))}
        {!providers.length && (
          <Centered style={{ marginTop: 100 }}>
            <BoldLight>
              <i18n.Translate>No backup providers configured</i18n.Translate>
            </BoldLight>
            <Button variant="contained" color="success" onClick={onAddProvider}>
              <i18n.Translate>Add provider</i18n.Translate>
            </Button>
          </Centered>
        )}
      </section>
      {!!providers.length && (
        <footer>
          <div>
            <Button variant="contained" onClick={onShowInfo}>
              Show recovery
            </Button>
          </div>
          <div>
            <Button variant="contained" onClick={onSyncAll}>
              {providers.length > 1 ? (
                <i18n.Translate>Sync all backups</i18n.Translate>
              ) : (
                <i18n.Translate>Sync now</i18n.Translate>
              )}
            </Button>
            <Button variant="contained" color="success" onClick={onAddProvider}>
              <i18n.Translate>Add provider</i18n.Translate>
            </Button>
          </div>
        </footer>
      )}
    </Fragment>
  );
}

interface TransactionLayoutProps {
  status: ProviderPaymentStatus;
  timestamp?: AbsoluteTime;
  title: string;
  id: string;
  active: boolean;
}

function BackupLayout(props: TransactionLayoutProps): VNode {
  const { i18n } = useTranslationContext();
  const date = !props.timestamp ? undefined : new Date(props.timestamp.t_ms);
  const dateStr = date?.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  } as any);

  return (
    <RowBorderGray>
      <div style={{ color: !props.active ? "grey" : undefined }}>
        <a
          href={Pages.backupProviderDetail({
            pid: encodeURIComponent(props.id),
          })}
        >
          <span>{props.title}</span>
        </a>

        {dateStr && (
          <SmallText style={{ marginTop: 5 }}>
            <i18n.Translate>Last synced</i18n.Translate>: {dateStr}
          </SmallText>
        )}
        {!dateStr && (
          <SmallLightText style={{ marginTop: 5 }}>
            <i18n.Translate>Not synced</i18n.Translate>
          </SmallLightText>
        )}
      </div>
      <div>
        {props.status?.type === "paid" ? (
          <ExpirationText until={props.status.paidUntil} />
        ) : (
          <div>{props.status.type}</div>
        )}
      </div>
    </RowBorderGray>
  );
}

function ExpirationText({ until }: { until: AbsoluteTime }): VNode {
  const { i18n } = useTranslationContext();
  return (
    <Fragment>
      <CenteredText>
        <i18n.Translate>Expires in</i18n.Translate>
      </CenteredText>
      <CenteredBoldText {...{ color: colorByTimeToExpire(until) }}>
        {" "}
        {daysUntil(until)}{" "}
      </CenteredBoldText>
    </Fragment>
  );
}

function colorByTimeToExpire(d: AbsoluteTime): string {
  if (d.t_ms === "never") return "rgb(28, 184, 65)";
  const months = differenceInMonths(d.t_ms, new Date());
  return months > 1 ? "rgb(28, 184, 65)" : "rgb(223, 117, 20)";
}

function daysUntil(d: AbsoluteTime): string {
  if (d.t_ms === "never") return "";
  const duration = intervalToDuration({
    start: d.t_ms,
    end: new Date(),
  });
  const str = formatDuration(duration, {
    delimiter: ", ",
    format: [
      duration?.years
        ? "years"
        : duration?.months
        ? "months"
        : duration?.days
        ? "days"
        : duration.hours
        ? "hours"
        : "minutes",
    ],
  });
  return `${str}`;
}

function getStatusTypeOrder(t: ProviderPaymentStatus): number {
  return [
    ProviderPaymentType.InsufficientBalance,
    ProviderPaymentType.TermsChanged,
    ProviderPaymentType.Unpaid,
    ProviderPaymentType.Paid,
    ProviderPaymentType.Pending,
  ].indexOf(t.type);
}

function getStatusPaidOrder(
  a: ProviderPaymentPaid,
  b: ProviderPaymentPaid,
): number {
  return a.paidUntil.t_ms === "never"
    ? -1
    : b.paidUntil.t_ms === "never"
    ? 1
    : a.paidUntil.t_ms - b.paidUntil.t_ms;
}
