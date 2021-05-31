/*
 This file is part of TALER
 (C) 2015-2016 GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
 * Page shown to the user to confirm creation
 * of a reserve, usually requested by the bank.
 *
 * @author Florian Dold
 */

import * as i18n from "../i18n";

import { renderAmount } from "../renderHtml";

import { useState, useEffect } from "preact/hooks";
import {
  acceptWithdrawal,
  onUpdateNotification,
  getWithdrawalDetailsForUri,
} from "../wxApi";
import { WithdrawUriInfoResponse } from "@gnu-taler/taler-util";
import { JSX } from "preact/jsx-runtime";

interface Props {
  talerWithdrawUri?: string;
}

export interface ViewProps {
  talerWithdrawUri?: string;
  details?: WithdrawUriInfoResponse;
  cancelled?: boolean;
  selectedExchange?: string;
  accept: () => Promise<void>;
  setCancelled: (b: boolean) => void;
  setSelecting: (b: boolean) => void;
};

export function View({ talerWithdrawUri, details, cancelled, selectedExchange, accept, setCancelled, setSelecting }: ViewProps) {
  if (!talerWithdrawUri) {
    return <span>missing withdraw uri</span>;
  }

  if (!details) {
    return <span>Loading...</span>;
  }

  if (cancelled) {
    return <span>Withdraw operation has been cancelled.</span>;
  }

  return (
    <div>
      <h1>Digital Cash Withdrawal</h1>
      <i18n.Translate wrap="p">
        You are about to withdraw{" "}
        <strong>{renderAmount(details.amount)}</strong> from your bank account
        into your wallet.
      </i18n.Translate>
      {selectedExchange ? (
        <p>
          The exchange <strong>{selectedExchange}</strong> will be used as the
          Taler payment service provider.
        </p>
      ) : null}

      <div>
        <button
          className="pure-button button-success"
          disabled={!selectedExchange}
          onClick={() => accept()}
        >
          {i18n.str`Accept fees and withdraw`}
        </button>
        <p>
          <span
            role="button"
            tabIndex={0}
            style={{ textDecoration: "underline", cursor: "pointer" }}
            onClick={() => setSelecting(true)}
          >
            {i18n.str`Chose different exchange provider`}
          </span>
          <br />
          <span
            role="button"
            tabIndex={0}
            style={{ textDecoration: "underline", cursor: "pointer" }}
            onClick={() => setCancelled(true)}
          >
            {i18n.str`Cancel withdraw operation`}
          </span>
        </p>
      </div>
    </div>
  )
}

export function WithdrawalDialog({ talerWithdrawUri }: Props): JSX.Element {
  const [details, setDetails] = useState<WithdrawUriInfoResponse | undefined>(undefined);
  const [selectedExchange, setSelectedExchange] = useState<
    string | undefined
  >(undefined);
  const [cancelled, setCancelled] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [errMsg, setErrMsg] = useState<string | undefined>("");
  const [updateCounter, setUpdateCounter] = useState(1);

  useEffect(() => {
    return onUpdateNotification(() => {
      setUpdateCounter(updateCounter + 1);
    });
  }, []);

  useEffect(() => {
    if (!talerWithdrawUri) return
    const fetchData = async (): Promise<void> => {
      const res = await getWithdrawalDetailsForUri({ talerWithdrawUri });
      setDetails(res);
      if (res.defaultExchangeBaseUrl) {
        setSelectedExchange(res.defaultExchangeBaseUrl);
      }
    };
    fetchData();
  }, [selectedExchange, errMsg, selecting, talerWithdrawUri, updateCounter]);

  const accept = async (): Promise<void> => {
    if (!talerWithdrawUri) return
    if (!selectedExchange) {
      throw Error("can't accept, no exchange selected");
    }
    console.log("accepting exchange", selectedExchange);
    const res = await acceptWithdrawal(talerWithdrawUri, selectedExchange);
    console.log("accept withdrawal response", res);
    if (res.confirmTransferUrl) {
      document.location.href = res.confirmTransferUrl;
    }
  };

  return <View accept={accept}
    setCancelled={setCancelled} setSelecting={setSelecting}
    cancelled={cancelled} details={details} selectedExchange={selectedExchange}
    talerWithdrawUri={talerWithdrawUri}
  />
}


/**
 * @deprecated to be removed
 */
export function createWithdrawPage(): JSX.Element {
  const url = new URL(document.location.href);
  const talerWithdrawUri = url.searchParams.get("talerWithdrawUri");
  if (!talerWithdrawUri) {
    throw Error("withdraw URI required");
  }
  return <WithdrawalDialog talerWithdrawUri={talerWithdrawUri} />;
}
