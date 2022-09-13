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
import { AbsoluteTime, Duration, Location } from "@gnu-taler/taler-util";
import { WalletContractData } from "@gnu-taler/taler-wallet-core";
import { styled } from "@linaria/react";
import { Fragment, h, VNode } from "preact";
import { useState } from "preact/hooks";
import { Loading } from "../components/Loading.js";
import { LoadingError } from "../components/LoadingError.js";
import { Modal } from "../components/Modal.js";
import { Time } from "../components/Time.js";
import { useTranslationContext } from "../context/translation.js";
import { HookError, useAsyncAsHook } from "../hooks/useAsyncAsHook.js";
import { ButtonHandler } from "../mui/handlers.js";
import { compose, StateViewMap } from "../utils/index.js";
import * as wxApi from "../wxApi.js";
import { Amount } from "./Amount.js";
import { Link, LinkPrimary } from "./styled/index.js";

const ContractTermsTable = styled.table`
  width: 100%;
  border-spacing: 0px;
  & > tr > td {
    padding: 5px;
  }
  & > tr > td:nth-child(2n) {
    text-align: right;
  }
  & > tr:nth-child(2n) {
    background: #ebebeb;
  }
`;

function locationAsText(l: Location | undefined): VNode {
  if (!l) return <span />;
  const lines = [
    ...(l.address_lines || []).map((e) => [e]),
    [l.town_location, l.town, l.street],
    [l.building_name, l.building_number],
    [l.country, l.country_subdivision],
    [l.district, l.post_code],
  ];
  //remove all missing value
  //then remove all empty lines
  const curated = lines
    .map((l) => l.filter((v) => !!v))
    .filter((l) => l.length > 0);
  return (
    <span>
      {curated.map((c, i) => (
        <div key={i}>{c.join(",")}</div>
      ))}
    </span>
  );
}

type State = States.Loading | States.Error | States.Hidden | States.Show;

namespace States {
  export interface Loading {
    status: "loading";
    hideHandler: ButtonHandler;
  }
  export interface Error {
    status: "error";
    proposalId: string;
    error: HookError;
    hideHandler: ButtonHandler;
  }
  export interface Hidden {
    status: "hidden";
    showHandler: ButtonHandler;
  }
  export interface Show {
    status: "show";
    hideHandler: ButtonHandler;
    contractTerms: WalletContractData;
  }
}

interface Props {
  proposalId: string;
}

function useComponentState({ proposalId }: Props, api: typeof wxApi): State {
  const [show, setShow] = useState(false);
  const hook = useAsyncAsHook(async () => {
    if (!show) return undefined;
    return await api.getContractTermsDetails(proposalId);
  }, [show]);

  const hideHandler = {
    onClick: async () => setShow(false),
  };
  const showHandler = {
    onClick: async () => setShow(true),
  };
  if (!show) {
    return {
      status: "hidden",
      showHandler,
    };
  }
  if (!hook) return { status: "loading", hideHandler };
  if (hook.hasError)
    return { status: "error", proposalId, error: hook, hideHandler };
  if (!hook.response) return { status: "loading", hideHandler };
  return {
    status: "show",
    contractTerms: hook.response,
    hideHandler,
  };
}

const viewMapping: StateViewMap<State> = {
  loading: LoadingView,
  error: ErrorView,
  show: ShowView,
  hidden: HiddenView,
};

export const ShowFullContractTermPopup = compose(
  "ShowFullContractTermPopup",
  (p: Props) => useComponentState(p, wxApi),
  viewMapping,
);

export function LoadingView({ hideHandler }: States.Loading): VNode {
  return (
    <Modal title="Full detail" onClose={hideHandler}>
      <Loading />
    </Modal>
  );
}

export function ErrorView({
  hideHandler,
  error,
  proposalId,
}: States.Error): VNode {
  const { i18n } = useTranslationContext();
  return (
    <Modal title="Full detail" onClose={hideHandler}>
      <LoadingError
        title={
          <i18n.Translate>
            Could not load purchase proposal details
          </i18n.Translate>
        }
        error={error}
      />
    </Modal>
  );
}

export function HiddenView({ showHandler }: States.Hidden): VNode {
  return <Link onClick={showHandler?.onClick}>Show full details</Link>;
}

export function ShowView({ contractTerms, hideHandler }: States.Show): VNode {
  const createdAt = AbsoluteTime.fromTimestamp(contractTerms.timestamp);
  const { i18n } = useTranslationContext();

  return (
    <Modal title="Full detail" onClose={hideHandler}>
      <div style={{ overflowY: "auto", height: "95%", padding: 5 }}>
        <ContractTermsTable>
          <tr>
            <td>
              <i18n.Translate>Order Id</i18n.Translate>
            </td>
            <td>{contractTerms.orderId}</td>
          </tr>
          <tr>
            <td>
              <i18n.Translate>Summary</i18n.Translate>
            </td>
            <td>{contractTerms.summary}</td>
          </tr>
          <tr>
            <td>
              <i18n.Translate>Amount</i18n.Translate>
            </td>
            <td>
              <Amount value={contractTerms.amount} />
            </td>
          </tr>
          <tr>
            <td>
              <i18n.Translate>Merchant name</i18n.Translate>
            </td>
            <td>{contractTerms.merchant.name}</td>
          </tr>
          <tr>
            <td>
              <i18n.Translate>Merchant jurisdiction</i18n.Translate>
            </td>
            <td>{locationAsText(contractTerms.merchant.jurisdiction)}</td>
          </tr>
          <tr>
            <td>
              <i18n.Translate>Merchant address</i18n.Translate>
            </td>
            <td>{locationAsText(contractTerms.merchant.address)}</td>
          </tr>
          <tr>
            <td>
              <i18n.Translate>Merchant logo</i18n.Translate>
            </td>
            <td>
              <div>
                <img
                  src={contractTerms.merchant.logo}
                  style={{ width: 64, height: 64, margin: 4 }}
                />
              </div>
            </td>
          </tr>
          <tr>
            <td>
              <i18n.Translate>Merchant website</i18n.Translate>
            </td>
            <td>{contractTerms.merchant.website}</td>
          </tr>
          <tr>
            <td>
              <i18n.Translate>Merchant email</i18n.Translate>
            </td>
            <td>{contractTerms.merchant.email}</td>
          </tr>
          <tr>
            <td>
              <i18n.Translate>Merchant public key</i18n.Translate>
            </td>
            <td>
              <span title={contractTerms.merchantPub}>
                {contractTerms.merchantPub.substring(0, 6)}...
              </span>
            </td>
          </tr>
          <tr>
            <td>
              <i18n.Translate>Delivery date</i18n.Translate>
            </td>
            <td>
              {contractTerms.deliveryDate && (
                <Time
                  timestamp={AbsoluteTime.fromTimestamp(
                    contractTerms.deliveryDate,
                  )}
                  format="dd MMMM yyyy, HH:mm"
                />
              )}
            </td>
          </tr>
          <tr>
            <td>
              <i18n.Translate>Delivery location</i18n.Translate>
            </td>
            <td>{locationAsText(contractTerms.deliveryLocation)}</td>
          </tr>
          <tr>
            <td>
              <i18n.Translate>Products</i18n.Translate>
            </td>
            <td>
              {!contractTerms.products || contractTerms.products.length === 0
                ? "none"
                : contractTerms.products
                    .map((p) => `${p.description} x ${p.quantity}`)
                    .join(", ")}
            </td>
          </tr>
          <tr>
            <td>
              <i18n.Translate>Created at</i18n.Translate>
            </td>
            <td>
              {contractTerms.timestamp && (
                <Time
                  timestamp={AbsoluteTime.fromTimestamp(
                    contractTerms.timestamp,
                  )}
                  format="dd MMMM yyyy, HH:mm"
                />
              )}
            </td>
          </tr>
          <tr>
            <td>
              <i18n.Translate>Refund deadline</i18n.Translate>
            </td>
            <td>
              {
                <Time
                  timestamp={AbsoluteTime.fromTimestamp(
                    contractTerms.refundDeadline,
                  )}
                  format="dd MMMM yyyy, HH:mm"
                />
              }
            </td>
          </tr>
          <tr>
            <td>
              <i18n.Translate>Auto refund</i18n.Translate>
            </td>
            <td>
              {
                <Time
                  timestamp={AbsoluteTime.addDuration(
                    createdAt,
                    !contractTerms.autoRefund
                      ? Duration.getZero()
                      : Duration.fromTalerProtocolDuration(
                          contractTerms.autoRefund,
                        ),
                  )}
                  format="dd MMMM yyyy, HH:mm"
                />
              }
            </td>
          </tr>
          <tr>
            <td>
              <i18n.Translate>Pay deadline</i18n.Translate>
            </td>
            <td>
              {
                <Time
                  timestamp={AbsoluteTime.fromTimestamp(
                    contractTerms.payDeadline,
                  )}
                  format="dd MMMM yyyy, HH:mm"
                />
              }
            </td>
          </tr>
          <tr>
            <td>
              <i18n.Translate>Fulfillment URL</i18n.Translate>
            </td>
            <td>{contractTerms.fulfillmentUrl}</td>
          </tr>
          <tr>
            <td>
              <i18n.Translate>Fulfillment message</i18n.Translate>
            </td>
            <td>{contractTerms.fulfillmentMessage}</td>
          </tr>
          {/* <tr>
          <td>Public reorder URL</td>
          <td>{contractTerms.public_reorder_url}</td>
        </tr> */}
          <tr>
            <td>
              <i18n.Translate>Max deposit fee</i18n.Translate>
            </td>
            <td>
              <Amount value={contractTerms.maxDepositFee} />
            </td>
          </tr>
          <tr>
            <td>
              <i18n.Translate>Max fee</i18n.Translate>
            </td>
            <td>
              <Amount value={contractTerms.maxWireFee} />
            </td>
          </tr>
          <tr>
            <td>
              <i18n.Translate>Minimum age</i18n.Translate>
            </td>
            <td>{contractTerms.minimumAge}</td>
          </tr>
          {/* <tr>
          <td>Extra</td>
          <td>
            <pre>{contractTerms.}</pre>
          </td>
        </tr> */}
          <tr>
            <td>
              <i18n.Translate>Wire fee amortization</i18n.Translate>
            </td>
            <td>{contractTerms.wireFeeAmortization}</td>
          </tr>
          <tr>
            <td>
              <i18n.Translate>Auditors</i18n.Translate>
            </td>
            <td>
              {(contractTerms.allowedAuditors || []).map((e) => (
                <Fragment key={e.auditorPub}>
                  <a href={e.auditorBaseUrl} title={e.auditorPub}>
                    {e.auditorPub.substring(0, 6)}...
                  </a>
                  &nbsp;
                </Fragment>
              ))}
            </td>
          </tr>
          <tr>
            <td>
              <i18n.Translate>Exchanges</i18n.Translate>
            </td>
            <td>
              {(contractTerms.allowedExchanges || []).map((e) => (
                <Fragment key={e.exchangePub}>
                  <a href={e.exchangeBaseUrl} title={e.exchangePub}>
                    {e.exchangePub.substring(0, 6)}...
                  </a>
                  &nbsp;
                </Fragment>
              ))}
            </td>
          </tr>
        </ContractTermsTable>
      </div>
    </Modal>
  );
}
