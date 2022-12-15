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

import * as utils from "@gnu-taler/taler-util";
import { AbsoluteTime } from "@gnu-taler/taler-util";
import {
  ProviderInfo,
  ProviderPaymentStatus,
  ProviderPaymentType,
  WalletApiOperation,
} from "@gnu-taler/taler-wallet-core";
import { Fragment, h, VNode } from "preact";
import { ErrorMessage } from "../components/ErrorMessage.js";
import { Loading } from "../components/Loading.js";
import { LoadingError } from "../components/LoadingError.js";
import { PaymentStatus, SmallLightText } from "../components/styled/index.js";
import { Time } from "../components/Time.js";
import { useBackendContext } from "../context/backend.js";
import { useTranslationContext } from "../context/translation.js";
import { useAsyncAsHook } from "../hooks/useAsyncAsHook.js";
import { Button } from "../mui/Button.js";

interface Props {
  pid: string;
  onBack: () => Promise<void>;
  onPayProvider: (uri: string) => Promise<void>;
  onWithdraw: (amount: string) => Promise<void>;
}

export function ProviderDetailPage({
  pid: providerURL,
  onBack,
  onPayProvider,
  onWithdraw,
}: Props): VNode {
  const { i18n } = useTranslationContext();
  const api = useBackendContext();
  async function getProviderInfo(): Promise<ProviderInfo | null> {
    //create a first list of backup info by currency
    const status = await api.wallet.call(WalletApiOperation.GetBackupInfo, {});

    const providers = status.providers.filter(
      (p) => p.syncProviderBaseUrl === providerURL,
    );
    return providers.length ? providers[0] : null;
  }

  const state = useAsyncAsHook(getProviderInfo);

  if (!state) {
    return <Loading />;
  }
  if (state.hasError) {
    return (
      <LoadingError
        title={
          <i18n.Translate>
            There was an error loading the provider detail for &quot;
            {providerURL}&quot;
          </i18n.Translate>
        }
        error={state}
      />
    );
  }
  const info = state.response;
  if (info === null) {
    return (
      <Fragment>
        <section>
          <p>
            <i18n.Translate>
              There is not known provider with url &quot;{providerURL}&quot;.
            </i18n.Translate>
          </p>
        </section>
        <footer>
          <Button variant="contained" color="secondary" onClick={onBack}>
            <i18n.Translate>See providers</i18n.Translate>
          </Button>
          <div />
        </footer>
      </Fragment>
    );
  }

  return (
    <ProviderView
      info={info}
      onSync={async () =>
        api.wallet
          .call(WalletApiOperation.RunBackupCycle, {
            providers: [providerURL],
          })
          .then()
      }
      onPayProvider={async () => {
        if (info.paymentStatus.type !== ProviderPaymentType.Pending) return;
        if (!info.paymentStatus.talerUri) return;
        onPayProvider(info.paymentStatus.talerUri);
      }}
      onWithdraw={async () => {
        if (info.paymentStatus.type !== ProviderPaymentType.InsufficientBalance)
          return;
        onWithdraw(info.paymentStatus.amount);
      }}
      onDelete={() =>
        api.wallet
          .call(WalletApiOperation.RemoveBackupProvider, {
            provider: providerURL,
          })
          .then(onBack)
      }
      onBack={onBack}
      onExtend={async () => {
        null;
      }}
    />
  );
}

export interface ViewProps {
  info: ProviderInfo;
  onDelete: () => Promise<void>;
  onSync: () => Promise<void>;
  onBack: () => Promise<void>;
  onExtend: () => Promise<void>;
  onPayProvider: () => Promise<void>;
  onWithdraw: () => Promise<void>;
}

export function ProviderView({
  info,
  onDelete,
  onPayProvider,
  onWithdraw,
  onSync,
  onBack,
  onExtend,
}: ViewProps): VNode {
  const { i18n } = useTranslationContext();
  const lb = info.lastSuccessfulBackupTimestamp
    ? AbsoluteTime.fromTimestamp(info.lastSuccessfulBackupTimestamp)
    : undefined;
  const isPaid =
    info.paymentStatus.type === ProviderPaymentType.Paid ||
    info.paymentStatus.type === ProviderPaymentType.TermsChanged;
  return (
    <Fragment>
      <Error info={info} />
      <header>
        <h3>
          {info.name}{" "}
          <SmallLightText>{info.syncProviderBaseUrl}</SmallLightText>
        </h3>
        <PaymentStatus color={isPaid ? "rgb(28, 184, 65)" : "rgb(202, 60, 60)"}>
          {isPaid ? "Paid" : "Unpaid"}
        </PaymentStatus>
      </header>
      <section>
        <p>
          <b>
            <i18n.Translate>Last backup</i18n.Translate>:
          </b>{" "}
          <Time timestamp={lb} format="dd MMMM yyyy" />
        </p>
        <Button variant="contained" onClick={onSync}>
          <i18n.Translate>Back up</i18n.Translate>
        </Button>
        {info.terms && (
          <Fragment>
            <p>
              <b>
                <i18n.Translate>Provider fee</i18n.Translate>:
              </b>{" "}
              {info.terms && info.terms.annualFee}{" "}
              <i18n.Translate>per year</i18n.Translate>
            </p>
          </Fragment>
        )}
        <p>{descriptionByStatus(info.paymentStatus, i18n)}</p>
        <Button variant="contained" disabled onClick={onExtend}>
          <i18n.Translate>Extend</i18n.Translate>
        </Button>

        {info.paymentStatus.type === ProviderPaymentType.TermsChanged && (
          <div>
            <p>
              <i18n.Translate>
                terms has changed, extending the service will imply accepting
                the new terms of service
              </i18n.Translate>
            </p>
            <table>
              <thead>
                <tr>
                  <td>&nbsp;</td>
                  <td>
                    <i18n.Translate>old</i18n.Translate>
                  </td>
                  <td> -&gt;</td>
                  <td>
                    <i18n.Translate>new</i18n.Translate>
                  </td>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <i18n.Translate>fee</i18n.Translate>
                  </td>
                  <td>{info.paymentStatus.oldTerms.annualFee}</td>
                  <td>-&gt;</td>
                  <td>{info.paymentStatus.newTerms.annualFee}</td>
                </tr>
                <tr>
                  <td>
                    <i18n.Translate>storage</i18n.Translate>
                  </td>
                  <td>{info.paymentStatus.oldTerms.storageLimitInMegabytes}</td>
                  <td>-&gt;</td>
                  <td>{info.paymentStatus.newTerms.storageLimitInMegabytes}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>
      <footer>
        <Button variant="contained" color="secondary" onClick={onBack}>
          <i18n.Translate>See providers</i18n.Translate>
        </Button>
        <div>
          <Button variant="contained" color="error" onClick={onDelete}>
            <i18n.Translate>Remove provider</i18n.Translate>
          </Button>
          {info.paymentStatus.type === ProviderPaymentType.Pending &&
          info.paymentStatus.talerUri ? (
            <Button variant="contained" color="primary" onClick={onPayProvider}>
              <i18n.Translate>Pay</i18n.Translate>
            </Button>
          ) : undefined}
          {info.paymentStatus.type ===
          ProviderPaymentType.InsufficientBalance ? (
            <Button variant="contained" color="primary" onClick={onWithdraw}>
              <i18n.Translate>Withdraw</i18n.Translate>
            </Button>
          ) : undefined}
        </div>
      </footer>
    </Fragment>
  );
}

function Error({ info }: { info: ProviderInfo }): VNode {
  const { i18n } = useTranslationContext();
  if (info.lastError) {
    return (
      <ErrorMessage
        title={
          <i18n.Translate>This provider has reported an error</i18n.Translate>
        }
        description={info.lastError.hint}
      />
    );
  }
  if (info.backupProblem) {
    switch (info.backupProblem.type) {
      case "backup-conflicting-device":
        return (
          <ErrorMessage
            title={
              <Fragment>
                <i18n.Translate>
                  There is conflict with another backup from{" "}
                  <b>{info.backupProblem.otherDeviceId}</b>
                </i18n.Translate>
              </Fragment>
            }
          />
        );
      case "backup-unreadable":
        return (
          <ErrorMessage
            title={<i18n.Translate>Backup is not readable</i18n.Translate>}
          />
        );
      default:
        return (
          <ErrorMessage
            title={
              <Fragment>
                <i18n.Translate>
                  Unknown backup problem: {JSON.stringify(info.backupProblem)}
                </i18n.Translate>
              </Fragment>
            }
          />
        );
    }
  }
  return <Fragment />;
}

function descriptionByStatus(
  status: ProviderPaymentStatus,
  i18n: typeof utils.i18n,
): VNode {
  switch (status.type) {
    case ProviderPaymentType.Paid:
    case ProviderPaymentType.TermsChanged:
      if (status.paidUntil.t_ms === "never") {
        return (
          <span>
            <i18n.Translate>service paid</i18n.Translate>
          </span>
        );
      }
      return (
        <Fragment>
          <b>
            <i18n.Translate>Backup valid until</i18n.Translate>:
          </b>{" "}
          <Time timestamp={status.paidUntil} format="dd MMM yyyy" />
        </Fragment>
      );

    case ProviderPaymentType.Unpaid:
    case ProviderPaymentType.InsufficientBalance:
    case ProviderPaymentType.Pending:
      return <span />;
  }
}
