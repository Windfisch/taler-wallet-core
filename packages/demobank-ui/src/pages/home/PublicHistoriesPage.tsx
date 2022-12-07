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

import { Logger } from "@gnu-taler/taler-util";
import { hooks } from "@gnu-taler/web-util/lib/index.browser";
import { ComponentChildren, Fragment, h, VNode } from "preact";
import { route } from "preact-router";
import { StateUpdater } from "preact/hooks";
import useSWR, { SWRConfig } from "swr";
import { PageStateType, usePageContext } from "../../context/pageState.js";
import { useTranslationContext } from "../../context/translation.js";
import { getBankBackendBaseUrl } from "../../utils.js";
import { BankFrame } from "./BankFrame.js";
import { Transactions } from "./Transactions.js";

const logger = new Logger("PublicHistoriesPage");

export function PublicHistoriesPage(): VNode {
  return (
    <SWRWithoutCredentials baseUrl={getBankBackendBaseUrl()}>
      <BankFrame>
        <PublicHistories />
      </BankFrame>
    </SWRWithoutCredentials>
  );
}

function SWRWithoutCredentials({
  baseUrl,
  children,
}: {
  children: ComponentChildren;
  baseUrl: string;
}): VNode {
  logger.trace("Base URL", baseUrl);
  return (
    <SWRConfig
      value={{
        fetcher: (url: string) =>
          fetch(baseUrl + url || "").then((r) => {
            if (!r.ok) throw { status: r.status, json: r.json() };

            return r.json();
          }),
      }}
    >
      {children as any}
    </SWRConfig>
  );
}

/**
 * Show histories of public accounts.
 */
function PublicHistories(): VNode {
  const { pageState, pageStateSetter } = usePageContext();
  const [showAccount, setShowAccount] = useShowPublicAccount();
  const { data, error } = useSWR("access-api/public-accounts");
  const { i18n } = useTranslationContext();

  if (typeof error !== "undefined") {
    switch (error.status) {
      case 404:
        logger.error("public accounts: 404", error);
        route("/account");
        pageStateSetter((prevState: PageStateType) => ({
          ...prevState,

          error: {
            title: i18n.str`List of public accounts was not found.`,
            debug: JSON.stringify(error),
          },
        }));
        break;
      default:
        logger.error("public accounts: non-404 error", error);
        route("/account");
        pageStateSetter((prevState: PageStateType) => ({
          ...prevState,

          error: {
            title: i18n.str`List of public accounts could not be retrieved.`,
            debug: JSON.stringify(error),
          },
        }));
        break;
    }
  }
  if (!data) return <p>Waiting public accounts list...</p>;
  const txs: Record<string, h.JSX.Element> = {};
  const accountsBar = [];

  /**
   * Show the account specified in the props, or just one
   * from the list if that's not given.
   */
  if (typeof showAccount === "undefined" && data.publicAccounts.length > 0) {
    setShowAccount(data.publicAccounts[1].accountLabel);
  }
  logger.trace(`Public history tab: ${showAccount}`);

  // Ask story of all the public accounts.
  for (const account of data.publicAccounts) {
    logger.trace("Asking transactions for", account.accountLabel);
    const isSelected = account.accountLabel == showAccount;
    accountsBar.push(
      <li
        class={
          isSelected
            ? "pure-menu-selected pure-menu-item"
            : "pure-menu-item pure-menu"
        }
      >
        <a
          href="#"
          class="pure-menu-link"
          onClick={() => setShowAccount(account.accountLabel)}
        >
          {account.accountLabel}
        </a>
      </li>,
    );
    txs[account.accountLabel] = (
      <Transactions accountLabel={account.accountLabel} pageNumber={0} />
    );
  }

  return (
    <Fragment>
      <h1 class="nav">{i18n.str`History of public accounts`}</h1>
      <section id="main">
        <article>
          <div class="pure-menu pure-menu-horizontal" name="accountMenu">
            <ul class="pure-menu-list">{accountsBar}</ul>
            {typeof showAccount !== "undefined" ? (
              txs[showAccount]
            ) : (
              <p>No public transactions found.</p>
            )}
            <br />
            <a href="/account" class="pure-button">
              Go back
            </a>
          </div>
        </article>
      </section>
    </Fragment>
  );
}

/**
 * Stores in the state a object containing a 'username'
 * and 'password' field, in order to avoid losing the
 * handle of the data entered by the user in <input> fields.
 */
function useShowPublicAccount(
  state?: string,
): [string | undefined, StateUpdater<string | undefined>] {
  const ret = hooks.useLocalStorage(
    "show-public-account",
    JSON.stringify(state),
  );
  const retObj: string | undefined = ret[0] ? JSON.parse(ret[0]) : ret[0];
  const retSetter: StateUpdater<string | undefined> = function (val) {
    const newVal =
      val instanceof Function
        ? JSON.stringify(val(retObj))
        : JSON.stringify(val);
    ret[1](newVal);
  };
  return [retObj, retSetter];
}
