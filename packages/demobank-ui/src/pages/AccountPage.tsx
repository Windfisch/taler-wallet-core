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

import { Amounts, HttpStatusCode, Logger } from "@gnu-taler/taler-util";
import { useTranslationContext } from "@gnu-taler/web-util/lib/index.browser";
import { ComponentChildren, Fragment, h, VNode } from "preact";
import { useEffect } from "preact/hooks";
import useSWR, { SWRConfig, useSWRConfig } from "swr";
import { useBackendContext } from "../context/backend.js";
import { PageStateType, usePageContext } from "../context/pageState.js";
import { BackendInfo } from "../hooks/backend.js";
import { bankUiSettings } from "../settings.js";
import { getIbanFromPayto, prepareHeaders } from "../utils.js";
import { BankFrame } from "./BankFrame.js";
import { LoginForm } from "./LoginForm.js";
import { PaymentOptions } from "./PaymentOptions.js";
import { Transactions } from "./Transactions.js";
import { WithdrawalQRCode } from "./WithdrawalQRCode.js";

export function AccountPage(): VNode {
  const backend = useBackendContext();
  const { i18n } = useTranslationContext();

  if (backend.state.status === "loggedOut") {
    return (
      <BankFrame>
        <h1 class="nav">{i18n.str`Welcome to ${bankUiSettings.bankName}!`}</h1>
        <LoginForm />
      </BankFrame>
    );
  }

  return (
    <SWRWithCredentials info={backend.state}>
      <Account accountLabel={backend.state.username} />
    </SWRWithCredentials>
  );
}

/**
 * Factor out login credentials.
 */
function SWRWithCredentials({
  children,
  info,
}: {
  children: ComponentChildren;
  info: BackendInfo;
}): VNode {
  const { username, password, url: backendUrl } = info;
  const headers = prepareHeaders(username, password);
  return (
    <SWRConfig
      value={{
        fetcher: (url: string) => {
          return fetch(new URL(url, backendUrl).href, { headers }).then((r) => {
            if (!r.ok) throw { status: r.status, json: r.json() };

            return r.json();
          });
        },
      }}
    >
      {children as any}
    </SWRConfig>
  );
}

const logger = new Logger("AccountPage");

/**
 * Show only the account's balance.  NOTE: the backend state
 * is mostly needed to provide the user's credentials to POST
 * to the bank.
 */
function Account({ accountLabel }: { accountLabel: string }): VNode {
  const { cache } = useSWRConfig();

  // Getting the bank account balance:
  const endpoint = `access-api/accounts/${accountLabel}`;
  const { data, error, mutate } = useSWR(endpoint, {
    // refreshInterval: 0,
    // revalidateIfStale: false,
    // revalidateOnMount: false,
    // revalidateOnFocus: false,
    // revalidateOnReconnect: false,
  });
  const backend = useBackendContext();
  const { pageState, pageStateSetter: setPageState } = usePageContext();
  const { withdrawalId, talerWithdrawUri, timestamp } = pageState;
  const { i18n } = useTranslationContext();
  useEffect(() => {
    mutate();
  }, [timestamp]);

  /**
   * This part shows a list of transactions: with 5 elements by
   * default and offers a "load more" button.
   */
  // const [txPageNumber, setTxPageNumber] = useTransactionPageNumber();
  // const txsPages = [];
  // for (let i = 0; i <= txPageNumber; i++) {
  //   txsPages.push(<Transactions accountLabel={accountLabel} pageNumber={i} />);
  // }

  if (typeof error !== "undefined") {
    logger.error("account error", error, endpoint);
    /**
     * FIXME: to minimize the code, try only one invocation
     * of pageStateSetter, after having decided the error
     * message in the case-branch.
     */
    switch (error.status) {
      case 404: {
        backend.clear();
        setPageState((prevState: PageStateType) => ({
          ...prevState,

          error: {
            title: i18n.str`Username or account label '${accountLabel}' not found.  Won't login.`,
          },
        }));

        /**
         * 404 should never stick to the cache, because they
         * taint successful future registrations.  How?  After
         * registering, the user gets navigated to this page,
         * therefore a previous 404 on this SWR key (the requested
         * resource) would still appear as valid and cause this
         * page not to be shown! A typical case is an attempted
         * login of a unregistered user X, and then a registration
         * attempt of the same user X: in this case, the failed
         * login would cache a 404 error to X's profile, resulting
         * in the legitimate request after the registration to still
         * be flagged as 404.  Clearing the cache should prevent
         * this.  */
        (cache as any).clear();
        return <p>Profile not found...</p>;
      }
      case HttpStatusCode.Unauthorized:
      case HttpStatusCode.Forbidden: {
        backend.clear();
        setPageState((prevState: PageStateType) => ({
          ...prevState,
          error: {
            title: i18n.str`Wrong credentials given.`,
          },
        }));
        return <p>Wrong credentials...</p>;
      }
      default: {
        backend.clear();
        setPageState((prevState: PageStateType) => ({
          ...prevState,
          error: {
            title: i18n.str`Account information could not be retrieved.`,
            debug: JSON.stringify(error),
          },
        }));
        return <p>Unknown problem...</p>;
      }
    }
  }
  const balance = !data ? undefined : Amounts.parseOrThrow(data.balance.amount);
  const accountNumber = !data ? undefined : getIbanFromPayto(data.paytoUri);
  const balanceIsDebit = data && data.balance.credit_debit_indicator == "debit";

  /**
   * This block shows the withdrawal QR code.
   *
   * A withdrawal operation replaces everything in the page and
   * (ToDo:) starts polling the backend until either the wallet
   * selected a exchange and reserve public key, or a error / abort
   * happened.
   *
   * After reaching one of the above states, the user should be
   * brought to this ("Account") page where they get informed about
   * the outcome.
   */
  if (talerWithdrawUri && withdrawalId) {
    logger.trace("Bank created a new Taler withdrawal");
    return (
      <BankFrame>
        <WithdrawalQRCode
          withdrawalId={withdrawalId}
          talerWithdrawUri={talerWithdrawUri}
        />
      </BankFrame>
    );
  }
  const balanceValue = !balance ? undefined : Amounts.stringifyValue(balance);

  return (
    <BankFrame>
      <div>
        <h1 class="nav welcome-text">
          <i18n.Translate>
            Welcome,
            {accountNumber
              ? `${accountLabel} (${accountNumber})`
              : accountLabel}
            !
          </i18n.Translate>
        </h1>
      </div>
      <section id="assets">
        <div class="asset-summary">
          <h2>{i18n.str`Bank account balance`}</h2>
          {!balance ? (
            <div class="large-amount" style={{ color: "gray" }}>
              Waiting server response...
            </div>
          ) : (
            <div class="large-amount amount">
              {balanceIsDebit ? <b>-</b> : null}
              <span class="value">{`${balanceValue}`}</span>&nbsp;
              <span class="currency">{`${balance.currency}`}</span>
            </div>
          )}
        </div>
      </section>
      <section id="payments">
        <div class="payments">
          <h2>{i18n.str`Payments`}</h2>
          <PaymentOptions currency={balance?.currency} />
        </div>
      </section>
      <section id="main">
        <article>
          <h2>{i18n.str`Latest transactions:`}</h2>
          <Transactions
            balanceValue={balanceValue}
            pageNumber={0}
            accountLabel={accountLabel}
          />
        </article>
      </section>
    </BankFrame>
  );
}

// function useTransactionPageNumber(): [number, StateUpdater<number>] {
//   const ret = useNotNullLocalStorage("transaction-page", "0");
//   const retObj = JSON.parse(ret[0]);
//   const retSetter: StateUpdater<number> = function (val) {
//     const newVal =
//       val instanceof Function
//         ? JSON.stringify(val(retObj))
//         : JSON.stringify(val);
//     ret[1](newVal);
//   };
//   return [retObj, retSetter];
// }
