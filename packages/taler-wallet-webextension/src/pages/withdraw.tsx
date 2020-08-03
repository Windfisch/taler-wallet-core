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

import { WithdrawDetailView, renderAmount } from "../renderHtml";

import React, { useState, useEffect } from "react";
import {
  acceptWithdrawal,
  onUpdateNotification,
} from "../wxApi";

function WithdrawalDialog(props: { talerWithdrawUri: string }): JSX.Element {
  const [details, setDetails] = useState<
    any | undefined
  >();
  const [selectedExchange, setSelectedExchange] = useState<
    string | undefined
  >();
  const talerWithdrawUri = props.talerWithdrawUri;
  const [cancelled, setCancelled] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [customUrl, setCustomUrl] = useState<string>("");
  const [errMsg, setErrMsg] = useState<string | undefined>("");
  const [updateCounter, setUpdateCounter] = useState(1);

  useEffect(() => {
    return onUpdateNotification(() => {
      setUpdateCounter(updateCounter + 1);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
    // FIXME: re-implement with new API
    //   console.log("getting from", talerWithdrawUri);
    //   let d: WithdrawalDetailsResponse | undefined = undefined;
    //   try {
    //     d = await getWithdrawDetails(talerWithdrawUri, selectedExchange);
    //   } catch (e) {
    //     console.error(
    //       `error getting withdraw details for uri ${talerWithdrawUri}, exchange ${selectedExchange}`,
    //       e,
    //     );
    //     setErrMsg(e.message);
    //     return;
    //   }
    //   console.log("got withdrawDetails", d);
    //   if (!selectedExchange && d.bankWithdrawDetails.suggestedExchange) {
    //     console.log("setting selected exchange");
    //     setSelectedExchange(d.bankWithdrawDetails.suggestedExchange);
    //   }
    //   setDetails(d);
    };
    fetchData();
  }, [selectedExchange, errMsg, selecting, talerWithdrawUri, updateCounter]);

  if (errMsg) {
    return (
      <div>
        <i18n.Translate wrap="p">
          Could not get details for withdraw operation:
        </i18n.Translate>
        <p style={{ color: "red" }}>{errMsg}</p>
        <p>
          <span
            role="button"
            tabIndex={0}
            style={{ textDecoration: "underline", cursor: "pointer" }}
            onClick={() => {
              setSelecting(true);
              setErrMsg(undefined);
              setSelectedExchange(undefined);
              setDetails(undefined);
            }}
          >
            {i18n.str`Chose different exchange provider`}
          </span>
        </p>
      </div>
    );
  }

  if (!details) {
    return <span>Loading...</span>;
  }

  if (cancelled) {
    return <span>Withdraw operation has been cancelled.</span>;
  }

  if (selecting) {
    const bankSuggestion =
      details && details.bankWithdrawDetails.suggestedExchange;
    return (
      <div>
        {i18n.str`Please select an exchange.  You can review the details before after your selection.`}
        {bankSuggestion && (
          <div>
            <h2>Bank Suggestion</h2>
            <button
              className="pure-button button-success"
              onClick={() => {
                setDetails(undefined);
                setSelectedExchange(bankSuggestion);
                setSelecting(false);
              }}
            >
              <i18n.Translate wrap="span">
                Select <strong>{bankSuggestion}</strong>
              </i18n.Translate>
            </button>
          </div>
        )}
        <h2>Custom Selection</h2>
        <p>
          <input
            type="text"
            onChange={(e) => setCustomUrl(e.target.value)}
            value={customUrl}
          />
        </p>
        <button
          className="pure-button button-success"
          onClick={() => {
            setDetails(undefined);
            setSelectedExchange(customUrl);
            setSelecting(false);
          }}
        >
          <i18n.Translate wrap="span">Select custom exchange</i18n.Translate>
        </button>
      </div>
    );
  }

  const accept = async (): Promise<void> => {
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

  return (
    <div>
      <h1>Digital Cash Withdrawal</h1>
      <i18n.Translate wrap="p">
        You are about to withdraw{" "}
        <strong>{renderAmount(details.bankWithdrawDetails.amount)}</strong> from
        your bank account into your wallet.
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

        {details.exchangeWithdrawDetails ? (
          <WithdrawDetailView rci={details.exchangeWithdrawDetails} />
        ) : null}
      </div>
    </div>
  );
}

export function createWithdrawPage(): JSX.Element {
  const url = new URL(document.location.href);
  const talerWithdrawUri = url.searchParams.get("talerWithdrawUri");
  if (!talerWithdrawUri) {
    throw Error("withdraw URI required");
  }
  return <WithdrawalDialog talerWithdrawUri={talerWithdrawUri} />;
}
