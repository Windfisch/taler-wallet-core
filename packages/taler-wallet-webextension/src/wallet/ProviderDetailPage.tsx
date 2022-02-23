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

import { Translate } from "@gnu-taler/taler-util";
import {
  ProviderInfo,
  ProviderPaymentStatus,
  ProviderPaymentType,
} from "@gnu-taler/taler-wallet-core";
import { Fragment, h, VNode } from "preact";
import { ErrorMessage } from "../components/ErrorMessage";
import { Loading } from "../components/Loading";
import { LoadingError } from "../components/LoadingError";
import {
  Button,
  ButtonDestructive,
  ButtonPrimary,
  PaymentStatus,
  SmallLightText,
} from "../components/styled";
import { Time } from "../components/Time";
import { useAsyncAsHook } from "../hooks/useAsyncAsHook";
import * as wxApi from "../wxApi";

interface Props {
  pid: string;
  onBack: () => void;
}

export function ProviderDetailPage({ pid: providerURL, onBack }: Props): VNode {
  async function getProviderInfo(): Promise<ProviderInfo | null> {
    //create a first list of backup info by currency
    const status = await wxApi.getBackupInfo();

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
          <Translate>
            There was an error loading the provider detail for "{providerURL}"
          </Translate>
        }
        error={state}
      />
    );
  }

  return (
    <ProviderView
      url={providerURL}
      info={state.response}
      onSync={async () => wxApi.syncOneProvider(providerURL)}
      onDelete={async () => wxApi.removeProvider(providerURL).then(onBack)}
      onBack={onBack}
      onExtend={() => {
        null;
      }}
    />
  );
}

export interface ViewProps {
  url: string;
  info: ProviderInfo | null;
  onDelete: () => void;
  onSync: () => void;
  onBack: () => void;
  onExtend: () => void;
}

export function ProviderView({
  info,
  url,
  onDelete,
  onSync,
  onBack,
  onExtend,
}: ViewProps): VNode {
  if (info === null) {
    return (
      <Fragment>
        <section>
          <p>
            <Translate>There is not known provider with url "{url}".</Translate>
          </p>
        </section>
        <footer>
          <Button onClick={onBack}>
            &lt; <Translate>Back</Translate>
          </Button>
          <div />
        </footer>
      </Fragment>
    );
  }
  const lb = info.lastSuccessfulBackupTimestamp;
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
            <Translate>Last backup</Translate>:
          </b>{" "}
          <Time timestamp={lb} format="dd MMMM yyyy" />
        </p>
        <ButtonPrimary onClick={onSync}>
          <Translate>Back up</Translate>
        </ButtonPrimary>
        {info.terms && (
          <Fragment>
            <p>
              <b>
                <Translate>Provider fee</Translate>:
              </b>{" "}
              {info.terms && info.terms.annualFee}{" "}
              <Translate>per year</Translate>
            </p>
          </Fragment>
        )}
        <p>{descriptionByStatus(info.paymentStatus)}</p>
        <ButtonPrimary disabled onClick={onExtend}>
          <Translate>Extend</Translate>
        </ButtonPrimary>

        {info.paymentStatus.type === ProviderPaymentType.TermsChanged && (
          <div>
            <p>
              <Translate>
                terms has changed, extending the service will imply accepting
                the new terms of service
              </Translate>
            </p>
            <table>
              <thead>
                <tr>
                  <td>&nbsp;</td>
                  <td>
                    <Translate>old</Translate>
                  </td>
                  <td> -&gt;</td>
                  <td>
                    <Translate>new</Translate>
                  </td>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <Translate>fee</Translate>
                  </td>
                  <td>{info.paymentStatus.oldTerms.annualFee}</td>
                  <td>-&gt;</td>
                  <td>{info.paymentStatus.newTerms.annualFee}</td>
                </tr>
                <tr>
                  <td>
                    <Translate>storage</Translate>
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
        <Button onClick={onBack}>
          &lt; <Translate>back</Translate>
        </Button>
        <div>
          <ButtonDestructive onClick={onDelete}>
            <Translate>Remove provider</Translate>
          </ButtonDestructive>
        </div>
      </footer>
    </Fragment>
  );
}

function Error({ info }: { info: ProviderInfo }): VNode {
  if (info.lastError) {
    return (
      <ErrorMessage
        title={<Translate>This provider has reported an error</Translate>}
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
                <Translate>
                  There is conflict with another backup from{" "}
                  <b>{info.backupProblem.otherDeviceId}</b>
                </Translate>
              </Fragment>
            }
          />
        );
      case "backup-unreadable":
        return (
          <ErrorMessage title={<Translate>Backup is not readable</Translate>} />
        );
      default:
        return (
          <ErrorMessage
            title={
              <Fragment>
                <Translate>
                  Unknown backup problem: {JSON.stringify(info.backupProblem)}
                </Translate>
              </Fragment>
            }
          />
        );
    }
  }
  return <Fragment />;
}

function descriptionByStatus(status: ProviderPaymentStatus): VNode {
  switch (status.type) {
    case ProviderPaymentType.Paid:
    case ProviderPaymentType.TermsChanged:
      if (status.paidUntil.t_ms === "never") {
        return (
          <span>
            <Translate>service paid</Translate>
          </span>
        );
      }
      return (
        <Fragment>
          <b>
            <Translate>Backup valid until</Translate>:
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
