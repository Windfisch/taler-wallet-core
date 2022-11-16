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

/* eslint-disable @typescript-eslint/no-explicit-any */
import { createContext, Fragment, h, VNode } from "preact";
import useSWR, { SWRConfig, useSWRConfig } from "swr";

import {
  StateUpdater,
  useContext,
  useEffect,
  useRef,
  useState,
} from "preact/hooks";
import talerLogo from "../../assets/logo-white.svg";
import { LangSelectorLikePy as LangSelector } from "../../components/menu/LangSelector.js";
import { QR } from "../../components/QR.js";
import { useLocalStorage, useNotNullLocalStorage } from "../../hooks/index.js";
import { Translate, useTranslator } from "../../i18n/index.js";
import "../../scss/main.scss";
import { Amounts, HttpStatusCode, parsePaytoUri } from "@gnu-taler/taler-util";
import { createHashHistory } from "history";
import Router, { Route, route } from "preact-router";

interface BankUiSettings {
  allowRegistrations: boolean;
  showDemoNav: boolean;
  bankName: string;
  demoSites: [string, string][];
}

/**
 * Global settings for the demobank UI.
 */
const defaultSettings: BankUiSettings = {
  allowRegistrations: true,
  bankName: "Taler Bank",
  showDemoNav: true,
  demoSites: [
    ["Landing", "https://demo.taler.net/"],
    ["Bank", "https://bank.demo.taler.net/"],
    ["Essay Shop", "https://shop.demo.taler.net/"],
    ["Donations", "https://donations.demo.taler.net/"],
    ["Survey", "https://survey.demo.taler.net/"],
  ],
};

const bankUiSettings: BankUiSettings =
  "talerDemobankSettings" in globalThis
    ? (globalThis as any).talerDemobankSettings
    : defaultSettings;

/**
 * FIXME:
 *
 * - INPUT elements have their 'required' attribute ignored.
 *
 * - the page needs a "home" button that either redirects to
 *   the profile page (when the user is logged in), or to
 *   the very initial home page.
 *
 * - histories 'pages' are grouped in UL elements that cause
 *   the rendering to visually separate each UL.  History elements
 *   should instead line up without any separation caused by
 *   a implementation detail.
 *
 * - Many strings need to be i18n-wrapped.
 */

/***********
 * Globals *
 **********/

/************
 * Contexts *
 ***********/
const CurrencyContext = createContext<any>(null);
type PageContextType = [PageStateType, StateUpdater<PageStateType>];
const PageContextDefault: PageContextType = [
  {
    hasError: false,
    hasInfo: false,
    isLoggedIn: false,
    isRawPayto: false,
    showPublicHistories: false,

    withdrawalInProgress: false,
  },
  () => {
    null;
  },
];
const PageContext = createContext<PageContextType>(PageContextDefault);

/**********************************************
 * Type definitions for states and API calls. *
 *********************************************/

/**
 * Has the information to reach and
 * authenticate at the bank's backend.
 */
interface BackendStateType {
  url?: string;
  username?: string;
  password?: string;
}

/**
 * Request body of POST /transactions.
 *
 * If the amount appears twice: both as a Payto parameter and
 * in the JSON dedicate field, the one on the Payto URI takes
 * precedence.
 */
interface TransactionRequestType {
  paytoUri: string;
  amount?: string; // with currency.
}

/**
 * Request body of /register.
 */
interface CredentialsRequestType {
  username?: string;
  password?: string;
  repeatPassword?: string;
}

/**
 * Request body of /register.
 */
// interface LoginRequestType {
//   username: string;
//   password: string;
// }

interface WireTransferRequestType {
  iban?: string;
  subject?: string;
  amount?: string;
}

/**
 * Track page state.
 */
interface PageStateType {
  isLoggedIn: boolean;
  isRawPayto: boolean;
  showPublicHistories: boolean;
  hasError: boolean;
  hasInfo: boolean;
  withdrawalInProgress: boolean;
  error?: {
    description?: string;
    title: string;
    debug?: string;
  };

  info?: string;
  talerWithdrawUri?: string;
  /**
   * Not strictly a presentational value, could
   * be moved in a future "withdrawal state" object.
   */
  withdrawalId?: string;
  timestamp?: number;
}

/**
 * Bank account specific information.
 */
// interface AccountStateType {
//   balance: string;
//   /* FIXME: Need history here.  */
// }

/************
 * Helpers. *
 ***********/

function maybeDemoContent(content: VNode): VNode {
  if (bankUiSettings.showDemoNav) {
    return content;
  }
  return <Fragment />;
}

/**
 * Bring the state to show the public accounts page.
 */
function goPublicAccounts(pageStateSetter: StateUpdater<PageStateType>) {
  return () =>
    pageStateSetter((prevState) => ({
      ...prevState,
      showPublicHistories: true,
    }));
}

/**
 * Validate (the number part of) an amount.  If needed,
 * replace comma with a dot.  Returns 'false' whenever
 * the input is invalid, the valid amount otherwise.
 */
function validateAmount(maybeAmount: string): any {
  const amountRegex = "^[0-9]+(.[0-9]+)?$";
  if (!maybeAmount) {
    console.log(`Entered amount (${maybeAmount}) mismatched <input> pattern.`);
    return;
  }
  if (typeof maybeAmount !== "undefined" || maybeAmount !== "") {
    console.log(`Maybe valid amount: ${maybeAmount}`);
    // tolerating comma instead of point.
    const re = RegExp(amountRegex);
    if (!re.test(maybeAmount)) {
      console.log(`Not using invalid amount '${maybeAmount}'.`);
      return false;
    }
  }
  return maybeAmount;
}

/**
 * Extract IBAN from a Payto URI.
 */
function getIbanFromPayto(url: string): string {
  const pathSplit = new URL(url).pathname.split("/");
  let lastIndex = pathSplit.length - 1;
  // Happens if the path ends with "/".
  if (pathSplit[lastIndex] === "") lastIndex--;
  const iban = pathSplit[lastIndex];
  return iban;
}

/**
 * Extract value and currency from a $currency:x.y amount.
 */
// function parseAmount(val: string): Amount {
//   Amounts.parse(val)
//   const format = /^[A-Z]+:[0-9]+(\.[0-9]+)?$/;
//   if (!format.test(val)) throw Error(`Backend gave invalid amount: ${val}.`);
//   const amountSplit = val.split(":");
//   return { value: amountSplit[1], currency: amountSplit[0] };
// }

/**
 * Get username from the backend state, and throw
 * exception if not found.
 */
function getUsername(backendState: BackendStateTypeOpt): string {
  if (typeof backendState === "undefined")
    throw Error("Username can't be found in a undefined backend state.");

  if (!backendState.username) {
    throw Error("No username, must login first.");
  }
  return backendState.username;
}

/**
 * Helps extracting the credentials from the state
 * and wraps the actual call to 'fetch'.  Should be
 * enclosed in a try-catch block by the caller.
 */
async function postToBackend(
  uri: string,
  backendState: BackendStateTypeOpt,
  body: string,
): Promise<any> {
  if (typeof backendState === "undefined")
    throw Error("Credentials can't be found in a undefined backend state.");

  const { username, password } = backendState;
  const headers = prepareHeaders(username, password);
  // Backend URL must have been stored _with_ a final slash.
  const url = new URL(uri, backendState.url);
  return await fetch(url.href, {
    method: "POST",
    headers,
    body,
  });
}

function useTransactionPageNumber(): [number, StateUpdater<number>] {
  const ret = useNotNullLocalStorage("transaction-page", "0");
  const retObj = JSON.parse(ret[0]);
  const retSetter: StateUpdater<number> = function (val) {
    const newVal =
      val instanceof Function
        ? JSON.stringify(val(retObj))
        : JSON.stringify(val);
    ret[1](newVal);
  };
  return [retObj, retSetter];
}

/**
 * Craft headers with Authorization and Content-Type.
 */
function prepareHeaders(username?: string, password?: string): Headers {
  const headers = new Headers();
  if (username && password) {
    headers.append(
      "Authorization",
      `Basic ${window.btoa(`${username}:${password}`)}`,
    );
  }
  headers.append("Content-Type", "application/json");
  return headers;
}

const getBankBackendBaseUrl = (): string => {
  const overrideUrl = localStorage.getItem("bank-base-url");
  if (overrideUrl) {
    console.log(
      `using bank base URL ${overrideUrl} (override via bank-base-url localStorage)`,
    );
    return overrideUrl;
  }
  const maybeRootPath = "https://bank.demo.taler.net/demobanks/default/";
  if (!maybeRootPath.endsWith("/")) return `${maybeRootPath}/`;
  console.log(`using bank base URL (${maybeRootPath})`);
  return maybeRootPath;
};

/*******************
 * State managers. *
 ******************/

/**
 * Stores in the state a object containing a 'username'
 * and 'password' field, in order to avoid losing the
 * handle of the data entered by the user in <input> fields.
 */
function useShowPublicAccount(
  state?: string,
): [string | undefined, StateUpdater<string | undefined>] {
  const ret = useLocalStorage("show-public-account", JSON.stringify(state));
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

/**
 * Stores the raw Payto value entered by the user in the state.
 */
type RawPaytoInputType = string;
type RawPaytoInputTypeOpt = RawPaytoInputType | undefined;
function useRawPaytoInputType(
  state?: RawPaytoInputType,
): [RawPaytoInputTypeOpt, StateUpdater<RawPaytoInputTypeOpt>] {
  const ret = useLocalStorage("raw-payto-input-state", state);
  const retObj: RawPaytoInputTypeOpt = ret[0];
  const retSetter: StateUpdater<RawPaytoInputTypeOpt> = function (val) {
    const newVal = val instanceof Function ? val(retObj) : val;
    ret[1](newVal);
  };
  return [retObj, retSetter];
}

/**
 * Stores in the state a object representing a wire transfer,
 * in order to avoid losing the handle of the data entered by
 * the user in <input> fields.  FIXME: name not matching the
 * purpose, as this is not a HTTP request body but rather the
 * state of the <input>-elements.
 */
type WireTransferRequestTypeOpt = WireTransferRequestType | undefined;
function useWireTransferRequestType(
  state?: WireTransferRequestType,
): [WireTransferRequestTypeOpt, StateUpdater<WireTransferRequestTypeOpt>] {
  const ret = useLocalStorage(
    "wire-transfer-request-state",
    JSON.stringify(state),
  );
  const retObj: WireTransferRequestTypeOpt = ret[0]
    ? JSON.parse(ret[0])
    : ret[0];
  const retSetter: StateUpdater<WireTransferRequestTypeOpt> = function (val) {
    const newVal =
      val instanceof Function
        ? JSON.stringify(val(retObj))
        : JSON.stringify(val);
    ret[1](newVal);
  };
  return [retObj, retSetter];
}

/**
 * Stores in the state a object containing a 'username'
 * and 'password' field, in order to avoid losing the
 * handle of the data entered by the user in <input> fields.
 */
type CredentialsRequestTypeOpt = CredentialsRequestType | undefined;
function useCredentialsRequestType(
  state?: CredentialsRequestType,
): [CredentialsRequestTypeOpt, StateUpdater<CredentialsRequestTypeOpt>] {
  const ret = useLocalStorage(
    "credentials-request-state",
    JSON.stringify(state),
  );
  const retObj: CredentialsRequestTypeOpt = ret[0]
    ? JSON.parse(ret[0])
    : ret[0];
  const retSetter: StateUpdater<CredentialsRequestTypeOpt> = function (val) {
    const newVal =
      val instanceof Function
        ? JSON.stringify(val(retObj))
        : JSON.stringify(val);
    ret[1](newVal);
  };
  return [retObj, retSetter];
}

/**
 * Return getters and setters for
 * login credentials and backend's
 * base URL.
 */
type BackendStateTypeOpt = BackendStateType | undefined;
function useBackendState(
  state?: BackendStateType,
): [BackendStateTypeOpt, StateUpdater<BackendStateTypeOpt>] {
  const ret = useLocalStorage("backend-state", JSON.stringify(state));
  const retObj: BackendStateTypeOpt = ret[0] ? JSON.parse(ret[0]) : ret[0];
  const retSetter: StateUpdater<BackendStateTypeOpt> = function (val) {
    const newVal =
      val instanceof Function
        ? JSON.stringify(val(retObj))
        : JSON.stringify(val);
    ret[1](newVal);
  };
  return [retObj, retSetter];
}

/**
 * Keep mere business information, like account balance or
 * transactions history.
 */
// type AccountStateTypeOpt = AccountStateType | undefined;
// function useAccountState(
//   state?: AccountStateType,
// ): [AccountStateTypeOpt, StateUpdater<AccountStateTypeOpt>] {
//   const ret = useLocalStorage("account-state", JSON.stringify(state));
//   const retObj: AccountStateTypeOpt = ret[0] ? JSON.parse(ret[0]) : ret[0];
//   const retSetter: StateUpdater<AccountStateTypeOpt> = function (val) {
//     const newVal =
//       val instanceof Function
//         ? JSON.stringify(val(retObj))
//         : JSON.stringify(val);
//     ret[1](newVal);
//   };
//   return [retObj, retSetter];
// }

/**
 * Wrapper providing defaults.
 */
function usePageState(
  state: PageStateType = {
    isLoggedIn: false,
    isRawPayto: false,
    showPublicHistories: false,
    hasError: false,
    hasInfo: false,
    withdrawalInProgress: false,
  },
): [PageStateType, StateUpdater<PageStateType>] {
  const ret = useNotNullLocalStorage("page-state", JSON.stringify(state));
  const retObj: PageStateType = JSON.parse(ret[0]);

  const retSetter: StateUpdater<PageStateType> = function (val) {
    const newVal =
      val instanceof Function
        ? JSON.stringify(val(retObj))
        : JSON.stringify(val);

    ret[1](newVal);
  };

  //when moving from one page to another
  //clean up the info and error bar
  function removeLatestInfo(val: any): ReturnType<typeof retSetter> {
    const updater = typeof val === "function" ? val : (c: any) => val;
    return retSetter((current: any) => {
      const cleanedCurrent: PageStateType = {
        ...current,
        hasInfo: false,
        info: undefined,
        hasError: false,
        errors: undefined,
        timestamp: new Date().getTime(),
      };
      return updater(cleanedCurrent);
    });
  }

  return [retObj, removeLatestInfo];
}

/**
 * Request preparators.
 *
 * These functions aim at sanitizing the input received
 * from users - for example via a HTML form - and create
 * a HTTP request object out of that.
 */

/******************
 * HTTP wrappers. *
 *****************/

/**
 * A 'wrapper' is typically a function that prepares one
 * particular API call and updates the state accordingly.  */

/**
 * Abort a withdrawal operation via the Access API's /abort.
 */
async function abortWithdrawalCall(
  backendState: BackendStateTypeOpt,
  withdrawalId: string | undefined,
  pageStateSetter: StateUpdater<PageStateType>,
): Promise<void> {
  if (typeof backendState === "undefined") {
    console.log("No credentials found.");
    pageStateSetter((prevState) => ({
      ...prevState,
      hasError: true,
      error: {
        title: `No credentials found.`,
      },
    }));
    return;
  }
  if (typeof withdrawalId === "undefined") {
    console.log("No withdrawal ID found.");
    pageStateSetter((prevState) => ({
      ...prevState,
      hasError: true,
      error: {
        title: `No withdrawal ID found.`,
      },
    }));
    return;
  }
  let res: any;
  try {
    const { username, password } = backendState;
    const headers = prepareHeaders(username, password);
    /**
     * NOTE: tests show that when a same object is being
     * POSTed, caching might prevent same requests from being
     * made.  Hence, trying to POST twice the same amount might
     * get silently ignored.  Needs more observation!
     *
     * headers.append("cache-control", "no-store");
     * headers.append("cache-control", "no-cache");
     * headers.append("pragma", "no-cache");
     * */

    // Backend URL must have been stored _with_ a final slash.
    const url = new URL(
      `access-api/accounts/${backendState.username}/withdrawals/${withdrawalId}/abort`,
      backendState.url,
    );
    res = await fetch(url.href, { method: "POST", headers });
  } catch (error) {
    console.log("Could not abort the withdrawal", error);
    pageStateSetter((prevState) => ({
      ...prevState,
      hasError: true,
      error: {
        title: `Could not abort the withdrawal.`,
        description: (error as any).error.description,
        debug: JSON.stringify(error),
      },
    }));
    return;
  }
  if (!res.ok) {
    const response = await res.json();
    console.log(
      `Withdrawal abort gave response error (${res.status})`,
      res.statusText,
    );
    pageStateSetter((prevState) => ({
      ...prevState,
      hasError: true,
      error: {
        title: `Withdrawal abortion failed.`,
        description: response.error.description,
        debug: JSON.stringify(response),
      },
    }));
    return;
  }
  console.log("Withdrawal operation aborted!");
  pageStateSetter((prevState) => {
    const { ...rest } = prevState;
    return {
      ...rest,
      info: "Withdrawal aborted!",
    };
  });
}

/**
 * This function confirms a withdrawal operation AFTER
 * the wallet has given the exchange's payment details
 * to the bank (via the Integration API).  Such details
 * can be given by scanning a QR code or by passing the
 * raw taler://withdraw-URI to the CLI wallet.
 *
 * This function will set the confirmation status in the
 * 'page state' and let the related components refresh.
 */
async function confirmWithdrawalCall(
  backendState: BackendStateTypeOpt,
  withdrawalId: string | undefined,
  pageStateSetter: StateUpdater<PageStateType>,
): Promise<void> {
  if (typeof backendState === "undefined") {
    console.log("No credentials found.");
    pageStateSetter((prevState) => ({
      ...prevState,
      hasError: true,
      error: {
        title: "No credentials found.",
      },
    }));
    return;
  }
  if (typeof withdrawalId === "undefined") {
    console.log("No withdrawal ID found.");
    pageStateSetter((prevState) => ({
      ...prevState,
      hasError: true,
      error: {
        title: "No withdrawal ID found.",
      },
    }));
    return;
  }
  let res: Response;
  try {
    const { username, password } = backendState;
    const headers = prepareHeaders(username, password);
    /**
     * NOTE: tests show that when a same object is being
     * POSTed, caching might prevent same requests from being
     * made.  Hence, trying to POST twice the same amount might
     * get silently ignored.
     *
     * headers.append("cache-control", "no-store");
     * headers.append("cache-control", "no-cache");
     * headers.append("pragma", "no-cache");
     * */

    // Backend URL must have been stored _with_ a final slash.
    const url = new URL(
      `access-api/accounts/${backendState.username}/withdrawals/${withdrawalId}/confirm`,
      backendState.url,
    );
    res = await fetch(url.href, {
      method: "POST",
      headers,
    });
  } catch (error) {
    console.log("Could not POST withdrawal confirmation to the bank", error);
    pageStateSetter((prevState) => ({
      ...prevState,
      hasError: true,
      error: {
        title: `Could not confirm the withdrawal`,
        description: (error as any).error.description,
        debug: JSON.stringify(error),
      },
    }));
    return;
  }
  if (!res || !res.ok) {
    const response = await res.json();
    // assume not ok if res is null
    console.log(
      `Withdrawal confirmation gave response error (${res.status})`,
      res.statusText,
    );
    pageStateSetter((prevState) => ({
      ...prevState,
      hasError: true,
      error: {
        title: `Withdrawal confirmation gave response error`,
        debug: JSON.stringify(response),
      },
    }));
    return;
  }
  console.log("Withdrawal operation confirmed!");
  pageStateSetter((prevState) => {
    const { talerWithdrawUri, ...rest } = prevState;
    return {
      ...rest,
      info: "Withdrawal confirmed!",
    };
  });
}

/**
 * This function creates a new transaction.  It reads a Payto
 * address entered by the user and POSTs it to the bank.  No
 * sanity-check of the input happens before the POST as this is
 * already conducted by the backend.
 */
async function createTransactionCall(
  req: TransactionRequestType,
  backendState: BackendStateTypeOpt,
  pageStateSetter: StateUpdater<PageStateType>,
  /**
   * Optional since the raw payto form doesn't have
   * a stateful management of the input data yet.
   */
  cleanUpForm: () => void,
): Promise<void> {
  let res: any;
  try {
    res = await postToBackend(
      `access-api/accounts/${getUsername(backendState)}/transactions`,
      backendState,
      JSON.stringify(req),
    );
  } catch (error) {
    console.log("Could not POST transaction request to the bank", error);
    pageStateSetter((prevState) => ({
      ...prevState,
      hasError: true,
      error: {
        title: `Could not create the wire transfer`,
        description: (error as any).error.description,
        debug: JSON.stringify(error),
      },
    }));
    return;
  }
  // POST happened, status not sure yet.
  if (!res.ok) {
    const response = await res.json();
    console.log(
      `Transfer creation gave response error: ${response} (${res.status})`,
    );
    pageStateSetter((prevState) => ({
      ...prevState,
      hasError: true,
      error: {
        title: `Transfer creation gave response error`,
        description: response.error.description,
        debug: JSON.stringify(response),
      },
    }));
    return;
  }
  // status is 200 OK here, tell the user.
  console.log("Wire transfer created!");
  pageStateSetter((prevState) => ({
    ...prevState,
    hasInfo: true,
    info: "Wire transfer created!",
  }));

  // Only at this point the input data can
  // be discarded.
  cleanUpForm();
}

/**
 * This function creates a withdrawal operation via the Access API.
 *
 * After having successfully created the withdrawal operation, the
 * user should receive a QR code of the "taler://withdraw/" type and
 * supposed to scan it with their phone.
 *
 * TODO: (1) after the scan, the page should refresh itself and inform
 * the user about the operation's outcome.  (2) use POST helper.  */
async function createWithdrawalCall(
  amount: string,
  backendState: BackendStateTypeOpt,
  pageStateSetter: StateUpdater<PageStateType>,
) {
  if (typeof backendState === "undefined") {
    console.log("Page has a problem: no credentials found in the state.");
    pageStateSetter((prevState) => ({
      ...prevState,
      hasError: true,
      error: {
        title: "No credentials given.",
      },
    }));
    return;
  }

  let res: any;
  try {
    const { username, password } = backendState;
    const headers = prepareHeaders(username, password);

    // Let bank generate withdraw URI:
    const url = new URL(
      `access-api/accounts/${backendState.username}/withdrawals`,
      backendState.url,
    );
    res = await fetch(url.href, {
      method: "POST",
      headers,
      body: JSON.stringify({ amount }),
    });
  } catch (error) {
    console.log("Could not POST withdrawal request to the bank", error);
    pageStateSetter((prevState) => ({
      ...prevState,
      hasError: true,
      error: {
        title: `Could not create withdrawal operation`,
        description: (error as any).error.description,
        debug: JSON.stringify(error),
      },
    }));
    return;
  }
  if (!res.ok) {
    const response = await res.json();
    console.log(
      `Withdrawal creation gave response error: ${response} (${res.status})`,
    );
    pageStateSetter((prevState) => ({
      ...prevState,
      hasError: true,
      error: {
        title: `Withdrawal creation gave response error`,
        description: response.error.description,
        debug: JSON.stringify(response),
      },
    }));
    return;
  }

  console.log("Withdrawal operation created!");
  const resp = await res.json();
  pageStateSetter((prevState: PageStateType) => ({
    ...prevState,
    withdrawalInProgress: true,
    talerWithdrawUri: resp.taler_withdraw_uri,
    withdrawalId: resp.withdrawal_id,
  }));
}

async function loginCall(
  req: CredentialsRequestType,
  /**
   * FIXME: figure out if the two following
   * functions can be retrieved from the state.
   */
  backendStateSetter: StateUpdater<BackendStateTypeOpt>,
  pageStateSetter: StateUpdater<PageStateType>,
) {
  /**
   * Optimistically setting the state as 'logged in', and
   * let the Account component request the balance to check
   * whether the credentials are valid.  */
  pageStateSetter((prevState) => ({ ...prevState, isLoggedIn: true }));
  let baseUrl = getBankBackendBaseUrl();
  if (!baseUrl.endsWith("/")) baseUrl += "/";

  backendStateSetter((prevState) => ({
    ...prevState,
    url: baseUrl,
    username: req.username,
    password: req.password,
  }));
}

/**
 * This function requests /register.
 *
 * This function is responsible to change two states:
 * the backend's (to store the login credentials) and
 * the page's (to indicate a successful login or a problem).
 */
async function registrationCall(
  req: CredentialsRequestType,
  /**
   * FIXME: figure out if the two following
   * functions can be retrieved somewhat from
   * the state.
   */
  backendStateSetter: StateUpdater<BackendStateTypeOpt>,
  pageStateSetter: StateUpdater<PageStateType>,
) {
  let baseUrl = getBankBackendBaseUrl();
  /**
   * If the base URL doesn't end with slash and the path
   * is not empty, then the concatenation made by URL()
   * drops the last path element.
   */
  if (!baseUrl.endsWith("/")) baseUrl += "/";

  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  const url = new URL("access-api/testing/register", baseUrl);
  let res: Response;
  try {
    res = await fetch(url.href, {
      method: "POST",
      body: JSON.stringify({
        username: req.username,
        password: req.password,
      }),
      headers,
    });
  } catch (error) {
    console.log(
      `Could not POST new registration to the bank (${url.href})`,
      error,
    );
    pageStateSetter((prevState) => ({
      ...prevState,
      hasError: true,
      error: {
        title: `Registration failed, please report`,
        debug: JSON.stringify(error),
      },
    }));
    return;
  }
  if (!res.ok) {
    const response = await res.json();
    if (res.status === 409) {
      pageStateSetter((prevState) => ({
        ...prevState,
        hasError: true,
        error: {
          title: `That username is already taken`,
          debug: JSON.stringify(response),
        },
      }));
    } else {
      pageStateSetter((prevState) => ({
        ...prevState,
        hasError: true,
        error: {
          title: `New registration gave response error`,
          debug: JSON.stringify(response),
        },
      }));
    }
  } else {
    // registration was ok
    pageStateSetter((prevState) => ({
      ...prevState,
      isLoggedIn: true,
    }));
    backendStateSetter((prevState) => ({
      ...prevState,
      url: baseUrl,
      username: req.username,
      password: req.password,
    }));
    route("/account");
  }
}

/**************************
 * Functional components. *
 *************************/

function ErrorBanner(Props: any): VNode | null {
  const [pageState, pageStateSetter] = Props.pageState;
  // const i18n = useTranslator();
  if (!pageState.hasError) return null;

  const rval = (
    <div class="informational informational-fail" style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <p>
          <b>{pageState.error.title}</b>
        </p>
        <div>
          <input
            type="button"
            class="pure-button"
            value="Clear"
            onClick={async () => {
              pageStateSetter((prev: any) => ({ ...prev, error: undefined }));
            }}
          />
        </div>
      </div>
      <p>{pageState.error.description}</p>
    </div>
  );
  delete pageState.error;
  pageState.hasError = false;
  return rval;
}

function StatusBanner(Props: any): VNode | null {
  const [pageState, pageStateSetter] = Props.pageState;
  const i18n = useTranslator();
  if (!pageState.hasInfo) return null;

  const rval = <p class="informational informational-ok">{pageState.info}</p>;
  return rval;
}

function BankFrame(Props: any): VNode {
  const i18n = useTranslator();
  const [pageState, pageStateSetter] = useContext(PageContext);
  console.log("BankFrame state", pageState);
  const logOut = (
    <div class="logout">
      <a
        href="#"
        class="pure-button logout-button"
        onClick={() => {
          pageStateSetter((prevState: PageStateType) => {
            const { talerWithdrawUri, withdrawalId, ...rest } = prevState;
            return {
              ...rest,
              isLoggedIn: false,
              withdrawalInProgress: false,
              hasInfo: false,
              hasError: false,
              isRawPayto: false,
            };
          });
        }}
      >{i18n`Logout`}</a>
    </div>
  );

  const demo_sites = [];
  for (const i in bankUiSettings.demoSites)
    demo_sites.push(
      <a href={bankUiSettings.demoSites[i][1]}>
        {bankUiSettings.demoSites[i][0]}
      </a>,
    );

  return (
    <Fragment>
      <header
        class="demobar"
        style="display: flex; flex-direction: row; justify-content: space-between;"
      >
        <a href="#main" class="skip">{i18n`Skip to main content`}</a>
        <div style="max-width: 50em; margin-left: 2em;">
          <h1>
            <span class="it">
              <a href="/">{bankUiSettings.bankName}</a>
            </span>
          </h1>
          {maybeDemoContent(
            <p>
              <Translate>
                This part of the demo shows how a bank that supports Taler
                directly would work. In addition to using your own bank account,
                you can also see the transaction history of some{" "}
                <a
                  href="/public-accounts"
                  onClick={goPublicAccounts(pageStateSetter)}
                >
                  Public Accounts
                </a>
                .
              </Translate>
            </p>,
          )}
        </div>
        <a href="https://taler.net/">
          <img
            src={talerLogo}
            alt={i18n`Taler logo`}
            height="100"
            width="224"
            style="margin: 2em 2em"
          />
        </a>
      </header>
      <div style="display:flex; flex-direction: column;" class="navcontainer">
        <nav class="demolist">
          {maybeDemoContent(<Fragment>{demo_sites}</Fragment>)}
          <div class="right">
            <LangSelector />
          </div>
        </nav>
      </div>
      <section id="main" class="content">
        <ErrorBanner pageState={[pageState, pageStateSetter]} />
        <StatusBanner pageState={[pageState, pageStateSetter]} />
        {pageState.isLoggedIn ? logOut : null}
        {Props.children}
      </section>
      <section id="footer" class="footer">
        <div class="footer">
          <hr />
          <div>
            <p>
              You can learn more about GNU Taler on our{" "}
              <a href="https://taler.net">main website</a>.
            </p>
          </div>
          <div style="flex-grow:1" />
          <p>Copyright &copy; 2014&mdash;2022 Taler Systems SA</p>
        </div>
      </section>
    </Fragment>
  );
}
function ShowInputErrorLabel({
  isDirty,
  message,
}: {
  message: string | undefined;
  isDirty: boolean;
}): VNode {
  if (message && isDirty)
    return (
      <div class="informational informational-fail" style={{ marginTop: 8 }}>
        {message}
      </div>
    );
  return <Fragment />;
}

function PaytoWireTransfer(Props: any): VNode {
  const currency = useContext(CurrencyContext);
  const [pageState, pageStateSetter] = useContext(PageContext); // NOTE: used for go-back button?
  const [submitData, submitDataSetter] = useWireTransferRequestType();
  // const [rawPaytoInput, rawPaytoInputSetter] = useRawPaytoInputType();
  const [rawPaytoInput, rawPaytoInputSetter] = useState<string | undefined>(
    undefined,
  );
  const i18n = useTranslator();
  const { focus, backendState } = Props;
  const amountRegex = "^[0-9]+(.[0-9]+)?$";
  const ibanRegex = "^[A-Z][A-Z][0-9]+$";
  const receiverInput = "";
  const subjectInput = "";
  let transactionData: TransactionRequestType;
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (focus) ref.current?.focus();
  }, [focus, pageState.isRawPayto]);

  // typeof submitData === "undefined" ||
  // typeof submitData.iban === "undefined" ||
  // submitData.iban === "" ||
  // typeof submitData.subject === "undefined" ||
  // submitData.subject === "" ||
  // typeof submitData.amount === "undefined" ||
  // submitData.amount === ""
  let parsedAmount = undefined;

  const errorsWire = !submitData
    ? undefined
    : undefinedIfEmpty({
        iban: !submitData.iban
          ? i18n`Missing IBAN`
          : !/^[A-Z0-9]*$/.test(submitData.iban)
          ? i18n`IBAN should have just uppercased letters and numbers`
          : undefined,
        subject: !submitData.subject ? i18n`Missing subject` : undefined,
        amount: !submitData.amount
          ? i18n`Missing amount`
          : !(parsedAmount = Amounts.parse(`${currency}:${submitData.amount}`))
          ? i18n`Amount is not valid`
          : Amounts.isZero(parsedAmount)
          ? i18n`Should be greater than 0`
          : undefined,
      });

  if (!pageState.isRawPayto)
    return (
      <div>
        <div class="pure-form" name="wire-transfer-form">
          <p>
            <label for="iban">{i18n`Receiver IBAN:`}</label>&nbsp;
            <input
              ref={ref}
              type="text"
              id="iban"
              name="iban"
              value={submitData?.iban ?? ""}
              placeholder="CC0123456789"
              required
              pattern={ibanRegex}
              onInput={(e): void => {
                submitDataSetter((submitData: any) => ({
                  ...submitData,
                  iban: e.currentTarget.value,
                }));
              }}
            />
            <br />
            <ShowInputErrorLabel
              message={errorsWire?.iban}
              isDirty={submitData?.iban !== undefined}
            />
            <br />
            <label for="subject">{i18n`Transfer subject:`}</label>&nbsp;
            <input
              type="text"
              name="subject"
              id="subject"
              placeholder="subject"
              value={submitData?.subject ?? ""}
              required
              onInput={(e): void => {
                submitDataSetter((submitData: any) => ({
                  ...submitData,
                  subject: e.currentTarget.value,
                }));
              }}
            />
            <br />
            <ShowInputErrorLabel
              message={errorsWire?.subject}
              isDirty={submitData?.subject !== undefined}
            />
            <br />
            <label for="amount">{i18n`Amount:`}</label>&nbsp;
            <input
              type="number"
              name="amount"
              id="amount"
              placeholder="amount"
              required
              value={submitData?.amount ?? ""}
              pattern={amountRegex}
              onInput={(e): void => {
                submitDataSetter((submitData: any) => ({
                  ...submitData,
                  amount: e.currentTarget.value,
                }));
              }}
            />
            &nbsp;
            <input
              type="text"
              readonly
              class="currency-indicator"
              size={currency.length}
              maxLength={currency.length}
              tabIndex={-1}
              value={currency}
            />
            <ShowInputErrorLabel
              message={errorsWire?.amount}
              isDirty={submitData?.amount !== undefined}
            />
          </p>

          <p style={{ display: "flex", justifyContent: "space-between" }}>
            <input
              type="submit"
              class="pure-button pure-button-primary"
              disabled={!!errorsWire}
              value="Send"
              onClick={async () => {
                if (
                  typeof submitData === "undefined" ||
                  typeof submitData.iban === "undefined" ||
                  submitData.iban === "" ||
                  typeof submitData.subject === "undefined" ||
                  submitData.subject === "" ||
                  typeof submitData.amount === "undefined" ||
                  submitData.amount === ""
                ) {
                  console.log("Not all the fields were given.");
                  pageStateSetter((prevState: PageStateType) => ({
                    ...prevState,
                    hasError: true,
                    error: {
                      title: i18n`Field(s) missing.`,
                    },
                  }));
                  return;
                }
                transactionData = {
                  paytoUri: `payto://iban/${
                    submitData.iban
                  }?message=${encodeURIComponent(submitData.subject)}`,
                  amount: `${currency}:${submitData.amount}`,
                };
                return await createTransactionCall(
                  transactionData,
                  backendState,
                  pageStateSetter,
                  () =>
                    submitDataSetter((p) => ({
                      amount: undefined,
                      iban: undefined,
                      subject: undefined,
                    })),
                );
              }}
            />
            <input
              type="button"
              class="pure-button"
              value="Clear"
              onClick={async () => {
                submitDataSetter((p) => ({
                  amount: undefined,
                  iban: undefined,
                  subject: undefined,
                }));
              }}
            />
          </p>
        </div>
        <p>
          <a
            href="/account"
            onClick={() => {
              console.log("switch to raw payto form");
              pageStateSetter((prevState: any) => ({
                ...prevState,
                isRawPayto: true,
              }));
            }}
          >
            {i18n`Want to try the raw payto://-format?`}
          </a>
        </p>
      </div>
    );

  const errorsPayto = undefinedIfEmpty({
    rawPaytoInput: !rawPaytoInput
      ? i18n`Missing payto address`
      : !parsePaytoUri(rawPaytoInput)
      ? i18n`Payto does not follow the pattern`
      : undefined,
  });

  return (
    <div>
      <p>{i18n`Transfer money to account identified by payto:// URI:`}</p>
      <div class="pure-form" name="payto-form">
        <p>
          <label for="address">{i18n`payto URI:`}</label>&nbsp;
          <input
            name="address"
            type="text"
            size={50}
            ref={ref}
            id="address"
            value={rawPaytoInput ?? ""}
            required
            placeholder={i18n`payto address`}
            // pattern={`payto://iban/[A-Z][A-Z][0-9]+?message=[a-zA-Z0-9 ]+&amount=${currency}:[0-9]+(.[0-9]+)?`}
            onInput={(e): void => {
              rawPaytoInputSetter(e.currentTarget.value);
            }}
          />
          <ShowInputErrorLabel
            message={errorsPayto?.rawPaytoInput}
            isDirty={rawPaytoInput !== undefined}
          />
          <br />
          <div class="hint">
            Hint:
            <code>
              payto://iban/[receiver-iban]?message=[subject]&amount=[{currency}
              :X.Y]
            </code>
          </div>
        </p>
        <p>
          <input
            class="pure-button pure-button-primary"
            type="submit"
            disabled={!!errorsPayto}
            value={i18n`Send`}
            onClick={async () => {
              // empty string evaluates to false.
              if (!rawPaytoInput) {
                console.log("Didn't get any raw Payto string!");
                return;
              }
              transactionData = { paytoUri: rawPaytoInput };
              if (
                typeof transactionData.paytoUri === "undefined" ||
                transactionData.paytoUri.length === 0
              )
                return;

              return await createTransactionCall(
                transactionData,
                backendState,
                pageStateSetter,
                () => rawPaytoInputSetter(undefined),
              );
            }}
          />
        </p>
        <p>
          <a
            href="/account"
            onClick={() => {
              console.log("switch to wire-transfer-form");
              pageStateSetter((prevState: any) => ({
                ...prevState,
                isRawPayto: false,
              }));
            }}
          >
            {i18n`Use wire-transfer form?`}
          </a>
        </p>
      </div>
    </div>
  );
}

/**
 * Additional authentication required to complete the operation.
 * Not providing a back button, only abort.
 */
function TalerWithdrawalConfirmationQuestion(Props: any): VNode {
  const [pageState, pageStateSetter] = useContext(PageContext);
  const { backendState } = Props;
  const i18n = useTranslator();
  const captchaNumbers = {
    a: Math.floor(Math.random() * 10),
    b: Math.floor(Math.random() * 10),
  };
  let captchaAnswer = "";

  return (
    <Fragment>
      <h1 class="nav">{i18n`Confirm Withdrawal`}</h1>
      <article>
        <div class="challenge-div">
          <form class="challenge-form">
            <div class="pure-form" id="captcha" name="capcha-form">
              <h2>{i18n`Authorize withdrawal by solving challenge`}</h2>
              <p>
                <label for="answer">
                  {i18n`What is`}&nbsp;
                  <em>
                    {captchaNumbers.a}&nbsp;+&nbsp;{captchaNumbers.b}
                  </em>
                  ?&nbsp;
                </label>
                &nbsp;
                <input
                  name="answer"
                  id="answer"
                  type="text"
                  autoFocus
                  required
                  onInput={(e): void => {
                    captchaAnswer = e.currentTarget.value;
                  }}
                />
              </p>
              <p>
                <button
                  class="pure-button pure-button-primary btn-confirm"
                  onClick={(e) => {
                    e.preventDefault();
                    if (
                      captchaAnswer ==
                      (captchaNumbers.a + captchaNumbers.b).toString()
                    ) {
                      confirmWithdrawalCall(
                        backendState,
                        pageState.withdrawalId,
                        pageStateSetter,
                      );
                      return;
                    }
                    pageStateSetter((prevState: PageStateType) => ({
                      ...prevState,
                      hasError: true,
                      error: {
                        title: i18n`Answer is wrong.`,
                      },
                    }));
                  }}
                >
                  {i18n`Confirm`}
                </button>
                &nbsp;
                <button
                  class="pure-button pure-button-secondary btn-cancel"
                  onClick={async () =>
                    await abortWithdrawalCall(
                      backendState,
                      pageState.withdrawalId,
                      pageStateSetter,
                    )
                  }
                >
                  {i18n`Cancel`}
                </button>
              </p>
            </div>
          </form>
          <div class="hint">
            <p>
              <Translate>
                A this point, a <b>real</b> bank would ask for an additional
                authentication proof (PIN/TAN, one time password, ..), instead
                of a simple calculation.
              </Translate>
            </p>
          </div>
        </div>
      </article>
    </Fragment>
  );
}

function QrCodeSection({
  talerWithdrawUri,
  abortButton,
}: {
  talerWithdrawUri: string;
  abortButton: h.JSX.Element;
}): VNode {
  const i18n = useTranslator();
  useEffect(() => {
    //Taler Wallet WebExtension is listening to headers response and tab updates.
    //In the SPA there is no header response with the Taler URI so
    //this hack manually triggers the tab update after the QR is in the DOM.
    window.location.hash = `/account/${new Date().getTime()}`;
  }, []);

  return (
    <section id="main" class="content">
      <h1 class="nav">{i18n`Transfer to Taler Wallet`}</h1>
      <article>
        <div class="qr-div">
          <p>{i18n`Use this QR code to withdraw to your mobile wallet:`}</p>
          {QR({ text: talerWithdrawUri })}
          <p>
            Click <a id="linkqr" href={talerWithdrawUri}>{i18n`this link`}</a>{" "}
            to open your Taler wallet!
          </p>
          <br />
          {abortButton}
        </div>
      </article>
    </section>
  );
}

/**
 * Offer the QR code (and a clickable taler://-link) to
 * permit the passing of exchange and reserve details to
 * the bank.  Poll the backend until such operation is done.
 */
function TalerWithdrawalQRCode(Props: any): VNode {
  // turns true when the wallet POSTed the reserve details:
  const [pageState, pageStateSetter] = useContext(PageContext);
  const { withdrawalId, talerWithdrawUri, accountLabel, backendState } = Props;
  const i18n = useTranslator();
  const abortButton = (
    <a
      class="pure-button btn-cancel"
      onClick={() => {
        pageStateSetter((prevState: PageStateType) => {
          return {
            ...prevState,
            withdrawalId: undefined,
            talerWithdrawUri: undefined,
            withdrawalInProgress: false,
          };
        });
      }}
    >{i18n`Abort`}</a>
  );

  console.log(`Showing withdraw URI: ${talerWithdrawUri}`);
  // waiting for the wallet:

  const { data, error } = useSWR(
    `integration-api/withdrawal-operation/${withdrawalId}`,
    { refreshInterval: 1000 },
  );

  if (typeof error !== "undefined") {
    console.log(
      `withdrawal (${withdrawalId}) was never (correctly) created at the bank...`,
      error,
    );
    pageStateSetter((prevState: PageStateType) => ({
      ...prevState,
      hasError: true,
      error: {
        title: i18n`withdrawal (${withdrawalId}) was never (correctly) created at the bank...`,
      },
    }));
    return (
      <Fragment>
        <br />
        <br />
        {abortButton}
      </Fragment>
    );
  }

  // data didn't arrive yet and wallet didn't communicate:
  if (typeof data === "undefined")
    return <p>{i18n`Waiting the bank to create the operation...`}</p>;

  /**
   * Wallet didn't communicate withdrawal details yet:
   */
  console.log("withdrawal status", data);
  if (data.aborted)
    pageStateSetter((prevState: PageStateType) => {
      const { withdrawalId, talerWithdrawUri, ...rest } = prevState;
      return {
        ...rest,
        withdrawalInProgress: false,
        hasError: true,
        error: {
          title: i18n`This withdrawal was aborted!`,
        },
      };
    });

  if (!data.selection_done) {
    return (
      <QrCodeSection
        talerWithdrawUri={talerWithdrawUri}
        abortButton={abortButton}
      />
    );
  }
  /**
   * Wallet POSTed the withdrawal details!  Ask the
   * user to authorize the operation (here CAPTCHA).
   */
  return <TalerWithdrawalConfirmationQuestion backendState={backendState} />;
}

function WalletWithdraw(Props: any): VNode {
  const { backendState, pageStateSetter, focus } = Props;
  const currency = useContext(CurrencyContext);
  const i18n = useTranslator();
  let submitAmount = "5.00";
  const amountRegex = "^[0-9]+(.[0-9]+)?$";

  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (focus) ref.current?.focus();
  }, [focus]);
  return (
    <div id="reserve-form" class="pure-form" name="tform">
      <p>
        <label for="withdraw-amount">{i18n`Amount to withdraw:`}</label>&nbsp;
        <input
          type="number"
          ref={ref}
          id="withdraw-amount"
          name="withdraw-amount"
          value={submitAmount}
          pattern={amountRegex}
          class="amount"
          onChange={(e): void => {
            // FIXME: validate using 'parseAmount()',
            // deactivate submit button as long as
            // amount is not valid
            submitAmount = e.currentTarget.value;
          }}
        />
        &nbsp;
        <input
          type="text"
          readonly
          class="currency-indicator"
          size={currency.length}
          maxLength={currency.length}
          tabIndex={-1}
          value={currency}
        />
      </p>
      <p>
        <div>
          <input
            id="select-exchange"
            class="pure-button pure-button-primary"
            type="submit"
            value={i18n`Withdraw`}
            onClick={() => {
              submitAmount = validateAmount(submitAmount);
              /**
               * By invalid amounts, the validator prints error messages
               * on the console, and the browser colourizes the amount input
               * box to indicate a error.
               */
              if (!submitAmount) return;
              createWithdrawalCall(
                `${currency}:${submitAmount}`,
                backendState,
                pageStateSetter,
              );
            }}
          />
        </div>
      </p>
    </div>
  );
}

/**
 * Let the user choose a payment option,
 * then specify the details trigger the action.
 */
function PaymentOptions(Props: any): VNode {
  const { backendState, pageStateSetter, focus } = Props;
  const currency = useContext(CurrencyContext);
  const i18n = useTranslator();

  const [tab, setTab] = useState<"charge-wallet" | "wire-transfer">(
    "charge-wallet",
  );

  return (
    <article>
      <div class="payments">
        <div class="tab">
          <button
            class={tab === "charge-wallet" ? "tablinks active" : "tablinks"}
            onClick={(): void => {
              setTab("charge-wallet");
            }}
          >
            {i18n`Obtain digital cash`}
          </button>
          <button
            class={tab === "wire-transfer" ? "tablinks active" : "tablinks"}
            onClick={(): void => {
              setTab("wire-transfer");
            }}
          >
            {i18n`Transfer to bank account`}
          </button>
        </div>
        {tab === "charge-wallet" && (
          <div id="charge-wallet" class="tabcontent active">
            <h3>{i18n`Obtain digital cash`}</h3>
            <WalletWithdraw
              backendState={backendState}
              focus
              pageStateSetter={pageStateSetter}
            />
          </div>
        )}
        {tab === "wire-transfer" && (
          <div id="wire-transfer" class="tabcontent active">
            <h3>{i18n`Transfer to bank account`}</h3>
            <PaytoWireTransfer
              backendState={backendState}
              focus
              pageStateSetter={pageStateSetter}
            />
          </div>
        )}
      </div>
    </article>
  );
}

function RegistrationButton(Props: any): VNode {
  const { backendStateSetter, pageStateSetter } = Props;
  const i18n = useTranslator();
  if (bankUiSettings.allowRegistrations)
    return (
      <button
        class="pure-button pure-button-secondary btn-cancel"
        onClick={() => {
          route("/register");
        }}
      >
        {i18n`Register`}
      </button>
    );

  return <span />;
}

function undefinedIfEmpty<T extends object>(obj: T): T | undefined {
  return Object.keys(obj).some((k) => (obj as any)[k] !== undefined)
    ? obj
    : undefined;
}
/**
 * Collect and submit login data.
 */
function LoginForm(Props: any): VNode {
  const { backendStateSetter, pageStateSetter } = Props;
  const [submitData, submitDataSetter] = useCredentialsRequestType();
  const i18n = useTranslator();
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);

  const errors = !submitData
    ? undefined
    : undefinedIfEmpty({
        username: !submitData.username ? i18n`Missing username` : undefined,
        password: !submitData.password ? i18n`Missing password` : undefined,
      });

  return (
    <div class="login-div">
      <form action="javascript:void(0);" class="login-form">
        <div class="pure-form">
          <h2>{i18n`Please login!`}</h2>
          <p class="unameFieldLabel loginFieldLabel formFieldLabel">
            <label for="username">{i18n`Username:`}</label>
          </p>
          <input
            ref={ref}
            autoFocus
            type="text"
            name="username"
            id="username"
            value={submitData && submitData.username}
            placeholder="Username"
            required
            onInput={(e): void => {
              submitDataSetter((submitData: any) => ({
                ...submitData,
                username: e.currentTarget.value,
              }));
            }}
          />
          <p class="passFieldLabel loginFieldLabel formFieldLabel">
            <label for="password">{i18n`Password:`}</label>
          </p>
          <input
            type="password"
            name="password"
            id="password"
            value={submitData && submitData.password}
            placeholder="Password"
            required
            onInput={(e): void => {
              submitDataSetter((submitData: any) => ({
                ...submitData,
                password: e.currentTarget.value,
              }));
            }}
          />
          <br />
          <button
            type="submit"
            class="pure-button pure-button-primary"
            disabled={!!errors}
            onClick={() => {
              if (typeof submitData === "undefined") {
                console.log("login data is undefined", submitData);
                return;
              }
              if (!submitData.password || !submitData.username) {
                console.log(
                  "username or password is the empty string",
                  submitData,
                );
                return;
              }
              loginCall(
                // Deep copy, to avoid the cleanup
                // below make data disappear.
                { ...submitData },
                backendStateSetter,
                pageStateSetter,
              );
              submitDataSetter({
                password: "",
                repeatPassword: "",
                username: "",
              });
            }}
          >
            {i18n`Login`}
          </button>
          {RegistrationButton(Props)}
        </div>
      </form>
    </div>
  );
}

/**
 * Collect and submit registration data.
 */
function RegistrationForm(Props: any): VNode {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [pageState, pageStateSetter] = useContext(PageContext);
  const [submitData, submitDataSetter] = useCredentialsRequestType();
  const i18n = useTranslator();

  const errors = !submitData
    ? undefined
    : undefinedIfEmpty({
        username: !submitData.username ? i18n`Missing username` : undefined,
        password: !submitData.password ? i18n`Missing password` : undefined,
        repeatPassword: !submitData.repeatPassword
          ? i18n`Missing password`
          : submitData.repeatPassword !== submitData.password
          ? i18n`Password don't match`
          : undefined,
      });

  return (
    <Fragment>
      <h1 class="nav">{i18n`Welcome to ${bankUiSettings.bankName}!`}</h1>
      <article>
        <div class="register-div">
          <form action="javascript:void(0);" class="register-form">
            <div class="pure-form">
              <h2>{i18n`Please register!`}</h2>
              <p class="unameFieldLabel registerFieldLabel formFieldLabel">
                <label for="register-un">{i18n`Username:`}</label>
              </p>
              <input
                id="register-un"
                name="register-un"
                type="text"
                placeholder="Username"
                value={submitData && submitData.username}
                required
                onInput={(e): void => {
                  submitDataSetter((submitData: any) => ({
                    ...submitData,
                    username: e.currentTarget.value,
                  }));
                }}
              />
              <br />
              <p class="unameFieldLabel registerFieldLabel formFieldLabel">
                <label for="register-pw">{i18n`Password:`}</label>
              </p>
              <input
                type="password"
                name="register-pw"
                id="register-pw"
                placeholder="Password"
                value={submitData && submitData.password}
                required
                onInput={(e): void => {
                  submitDataSetter((submitData: any) => ({
                    ...submitData,
                    password: e.currentTarget.value,
                  }));
                }}
              />
              <p class="unameFieldLabel registerFieldLabel formFieldLabel">
                <label for="register-repeat">{i18n`Repeat Password:`}</label>
              </p>
              <input
                type="password"
                style={{ marginBottom: 8 }}
                name="register-repeat"
                id="register-repeat"
                placeholder="Same password"
                value={submitData && submitData.repeatPassword}
                required
                onInput={(e): void => {
                  submitDataSetter((submitData: any) => ({
                    ...submitData,
                    repeatPassword: e.currentTarget.value,
                  }));
                }}
              />
              <br />
              {/*
              <label for="phone">{i18n`Phone number:`}</label>
              // FIXME: add input validation (must start with +, otherwise only numbers)
              <input
                name="phone"
                id="phone"
                type="phone"
                placeholder="+CC-123456789"
                value={submitData && submitData.phone}
                required
                onInput={(e): void => {
		  submitDataSetter((submitData: any) => ({
                    ...submitData,
                    phone: e.currentTarget.value,
                  }))}} />
              <br />
              */}
              <button
                class="pure-button pure-button-primary btn-register"
                disabled={!!errors}
                onClick={() => {
                  console.log("maybe submitting the registration..");
                  if (!submitData) return;
                  registrationCall(
                    { ...submitData },
                    Props.backendStateSetter, // will store BE URL, if OK.
                    pageStateSetter,
                  );
                  console.log("Clearing the input data");
                  /**
                   * FIXME: clearing the data should be done by setting
                   * it to undefined, instead of the empty strings, just
                   * like done in the login function.  Now set to the empty
                   * strings due to a non lively update of the <input> fields
                   * after setting to undefined.
                   */
                  submitDataSetter({
                    username: "",
                    password: "",
                    repeatPassword: "",
                  });
                }}
              >
                {i18n`Register`}
              </button>
              {/* FIXME: should use a different color */}
              <button
                class="pure-button pure-button-secondary btn-cancel"
                onClick={() => {
                  submitDataSetter({
                    username: "",
                    password: "",
                    repeatPassword: "",
                  });
                  route("/account");
                }}
              >
                {i18n`Cancel`}
              </button>
            </div>
          </form>
        </div>
      </article>
    </Fragment>
  );
}

/**
 * Show one page of transactions.
 */
function Transactions(Props: any): VNode {
  const { pageNumber, accountLabel, balanceValue } = Props;
  const i18n = useTranslator();
  const { data, error, mutate } = useSWR(
    `access-api/accounts/${accountLabel}/transactions?page=${pageNumber}`,
  );
  useEffect(() => {
    mutate();
  }, [balanceValue]);
  if (typeof error !== "undefined") {
    console.log("transactions not found error", error);
    switch (error.status) {
      case 404: {
        return <p>Transactions page {pageNumber} was not found.</p>;
      }
      case 401: {
        return <p>Wrong credentials given.</p>;
      }
      default: {
        return <p>Transaction page {pageNumber} could not be retrieved.</p>;
      }
    }
  }
  if (!data) {
    console.log(`History data of ${accountLabel} not arrived`);
    return <p>Transactions page loading...</p>;
  }
  console.log(`History data of ${accountLabel}`, data);
  return (
    <div class="results">
      <table class="pure-table pure-table-striped">
        <thead>
          <tr>
            <th>{i18n`Date`}</th>
            <th>{i18n`Amount`}</th>
            <th>{i18n`Counterpart`}</th>
            <th>{i18n`Subject`}</th>
          </tr>
        </thead>
        <tbody>
          {data.transactions.map((item: any, idx: number) => {
            const sign = item.direction == "DBIT" ? "-" : "";
            const counterpart =
              item.direction == "DBIT" ? item.creditorIban : item.debtorIban;
            // Pattern:
            //
            // DD/MM YYYY subject -5 EUR
            // DD/MM YYYY subject 5 EUR
            const dateRegex = /^([0-9]{4})-([0-9]{2})-([0-9]{1,2})/;
            const dateParse = dateRegex.exec(item.date);
            const date =
              dateParse !== null
                ? `${dateParse[3]}/${dateParse[2]} ${dateParse[1]}`
                : "date not found";
            return (
              <tr key={idx}>
                <td>{date}</td>
                <td>
                  {sign}
                  {item.amount} {item.currency}
                </td>
                <td>{counterpart}</td>
                <td>{item.subject}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Show only the account's balance.  NOTE: the backend state
 * is mostly needed to provide the user's credentials to POST
 * to the bank.
 */
function Account(Props: any): VNode {
  const { cache } = useSWRConfig();
  const { accountLabel, backendState } = Props;
  // Getting the bank account balance:
  const endpoint = `access-api/accounts/${accountLabel}`;
  const { data, error, mutate } = useSWR(endpoint, {
    // refreshInterval: 0,
    // revalidateIfStale: false,
    // revalidateOnMount: false,
    // revalidateOnFocus: false,
    // revalidateOnReconnect: false,
  });
  const [pageState, setPageState] = useContext(PageContext);
  const {
    withdrawalInProgress,
    withdrawalId,
    isLoggedIn,
    talerWithdrawUri,
    timestamp,
  } = pageState;
  const i18n = useTranslator();
  useEffect(() => {
    mutate();
  }, [timestamp]);

  /**
   * This part shows a list of transactions: with 5 elements by
   * default and offers a "load more" button.
   */
  const [txPageNumber, setTxPageNumber] = useTransactionPageNumber();
  const txsPages = [];
  for (let i = 0; i <= txPageNumber; i++)
    txsPages.push(<Transactions accountLabel={accountLabel} pageNumber={i} />);

  if (typeof error !== "undefined") {
    console.log("account error", error, endpoint);
    /**
     * FIXME: to minimize the code, try only one invocation
     * of pageStateSetter, after having decided the error
     * message in the case-branch.
     */
    switch (error.status) {
      case 404: {
        setPageState((prevState: PageStateType) => ({
          ...prevState,
          hasError: true,
          isLoggedIn: false,
          error: {
            title: i18n`Username or account label '${accountLabel}' not found.  Won't login.`,
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
        setPageState((prevState: PageStateType) => ({
          ...prevState,
          hasError: true,
          isLoggedIn: false,
          error: {
            title: i18n`Wrong credentials given.`,
          },
        }));
        return <p>Wrong credentials...</p>;
      }
      default: {
        setPageState((prevState: PageStateType) => ({
          ...prevState,
          hasError: true,
          isLoggedIn: false,
          error: {
            title: i18n`Account information could not be retrieved.`,
            debug: JSON.stringify(error),
          },
        }));
        return <p>Unknown problem...</p>;
      }
    }
  }
  if (!data) return <p>Retrieving the profile page...</p>;

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
  console.log(`maybe new withdrawal ${talerWithdrawUri}`);
  if (talerWithdrawUri) {
    console.log("Bank created a new Taler withdrawal");
    return (
      <BankFrame>
        <TalerWithdrawalQRCode
          accountLabel={accountLabel}
          backendState={backendState}
          withdrawalId={withdrawalId}
          talerWithdrawUri={talerWithdrawUri}
        />
      </BankFrame>
    );
  }
  const balance = Amounts.parseOrThrow(data.balance.amount);
  const balanceValue = Amounts.stringifyValue(balance);

  return (
    <BankFrame>
      <div>
        <h1 class="nav welcome-text">
          <Translate>
            Welcome, {accountLabel} ({getIbanFromPayto(data.paytoUri)})!
          </Translate>
        </h1>
      </div>
      <section id="assets">
        <div class="asset-summary">
          <h2>{i18n`Bank account balance`}</h2>
          {data.balance.credit_debit_indicator == "debit" ? <b>-</b> : null}
          <div class="large-amount amount">
            <span class="value">{`${balanceValue}`}</span>&nbsp;
            <span class="currency">{`${balance.currency}`}</span>
          </div>
        </div>
      </section>
      <section id="payments">
        <div class="payments">
          <h2>{i18n`Payments`}</h2>
          {/* FIXME: turn into button! */}
          <CurrencyContext.Provider value={balance.currency}>
            {Props.children}
            <PaymentOptions
              backendState={backendState}
              pageStateSetter={setPageState}
            />
          </CurrencyContext.Provider>
        </div>
      </section>
      <section id="main">
        <article>
          <h2>{i18n`Latest transactions:`}</h2>
          <Transactions
            balanceValue={balanceValue}
            pageNumber="0"
            accountLabel={accountLabel}
          />
        </article>
      </section>
    </BankFrame>
  );
}

/**
 * Factor out login credentials.
 */
function SWRWithCredentials(props: any): VNode {
  const { username, password, backendUrl } = props;
  const headers = new Headers();
  headers.append("Authorization", `Basic ${btoa(`${username}:${password}`)}`);
  console.log("Likely backend base URL", backendUrl);
  return (
    <SWRConfig
      value={{
        fetcher: (url: string) => {
          return fetch(backendUrl + url || "", { headers }).then((r) => {
            if (!r.ok) throw { status: r.status, json: r.json() };

            return r.json();
          });
        },
      }}
    >
      {props.children}
    </SWRConfig>
  );
}

function SWRWithoutCredentials(Props: any): VNode {
  const { baseUrl } = Props;
  console.log("Base URL", baseUrl);
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
      {Props.children}
    </SWRConfig>
  );
}

/**
 * Show histories of public accounts.
 */
function PublicHistories(Props: any): VNode {
  const [showAccount, setShowAccount] = useShowPublicAccount();
  const { data, error } = useSWR("access-api/public-accounts");
  const i18n = useTranslator();

  if (typeof error !== "undefined") {
    console.log("account error", error);
    switch (error.status) {
      case 404:
        console.log("public accounts: 404", error);
        Props.pageStateSetter((prevState: PageStateType) => ({
          ...prevState,
          hasError: true,
          showPublicHistories: false,
          error: {
            title: i18n`List of public accounts was not found.`,
            debug: JSON.stringify(error),
          },
        }));
        break;
      default:
        console.log("public accounts: non-404 error", error);
        Props.pageStateSetter((prevState: PageStateType) => ({
          ...prevState,
          hasError: true,
          showPublicHistories: false,
          error: {
            title: i18n`List of public accounts could not be retrieved.`,
            debug: JSON.stringify(error),
          },
        }));
        break;
    }
  }
  if (!data) return <p>Waiting public accounts list...</p>;
  const txs: any = {};
  const accountsBar = [];

  /**
   * Show the account specified in the props, or just one
   * from the list if that's not given.
   */
  if (typeof showAccount === "undefined" && data.publicAccounts.length > 0)
    setShowAccount(data.publicAccounts[1].accountLabel);
  console.log(`Public history tab: ${showAccount}`);

  // Ask story of all the public accounts.
  for (const account of data.publicAccounts) {
    console.log("Asking transactions for", account.accountLabel);
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
      <h1 class="nav">{i18n`History of public accounts`}</h1>
      <section id="main">
        <article>
          <div class="pure-menu pure-menu-horizontal" name="accountMenu">
            <ul class="pure-menu-list">{accountsBar}</ul>
            {typeof showAccount !== "undefined" ? (
              txs[showAccount]
            ) : (
              <p>No public transactions found.</p>
            )}
            {Props.children}
          </div>
        </article>
      </section>
    </Fragment>
  );
}

function PublicHistoriesPage(): VNode {
  // const [backendState, backendStateSetter] = useBackendState();
  const [pageState, pageStateSetter] = usePageState();
  // const i18n = useTranslator();
  return (
    <SWRWithoutCredentials baseUrl={getBankBackendBaseUrl()}>
      <PageContext.Provider value={[pageState, pageStateSetter]}>
        <BankFrame>
          <PublicHistories pageStateSetter={pageStateSetter}>
            <br />
            <a
              class="pure-button"
              onClick={() => {
                pageStateSetter((prevState: PageStateType) => ({
                  ...prevState,
                  showPublicHistories: false,
                }));
              }}
            >
              Go back
            </a>
          </PublicHistories>
        </BankFrame>
      </PageContext.Provider>
    </SWRWithoutCredentials>
  );
}

function RegistrationPage(): VNode {
  const [backendState, backendStateSetter] = useBackendState();
  const [pageState, pageStateSetter] = usePageState();
  const i18n = useTranslator();
  if (!bankUiSettings.allowRegistrations) {
    return (
      <PageContext.Provider value={[pageState, pageStateSetter]}>
        <BankFrame>
          <p>{i18n`Currently, the bank is not accepting new registrations!`}</p>
        </BankFrame>
      </PageContext.Provider>
    );
  }
  return (
    <PageContext.Provider value={[pageState, pageStateSetter]}>
      <BankFrame>
        <RegistrationForm backendStateSetter={backendStateSetter} />
      </BankFrame>
    </PageContext.Provider>
  );
}

function AccountPage(): VNode {
  const [backendState, backendStateSetter] = useBackendState();
  const [pageState, pageStateSetter] = usePageState();
  const i18n = useTranslator();

  if (!pageState.isLoggedIn) {
    return (
      <PageContext.Provider value={[pageState, pageStateSetter]}>
        <BankFrame>
          <h1 class="nav">{i18n`Welcome to ${bankUiSettings.bankName}!`}</h1>
          <LoginForm
            pageStateSetter={pageStateSetter}
            backendStateSetter={backendStateSetter}
          />
        </BankFrame>
      </PageContext.Provider>
    );
  }

  if (typeof backendState === "undefined") {
    pageStateSetter((prevState) => ({
      ...prevState,
      hasError: true,
      isLoggedIn: false,
      error: {
        title: i18n`Page has a problem: logged in but backend state is lost.`,
      },
    }));
    return <p>Error: waiting for details...</p>;
  }
  console.log("Showing the profile page..");
  return (
    <SWRWithCredentials
      username={backendState.username}
      password={backendState.password}
      backendUrl={backendState.url}
    >
      <PageContext.Provider value={[pageState, pageStateSetter]}>
        <Account
          accountLabel={backendState.username}
          backendState={backendState}
        />
      </PageContext.Provider>
    </SWRWithCredentials>
  );
}

function Redirect({ to }: { to: string }): VNode {
  useEffect(() => {
    route(to, true);
  }, []);
  return <div>being redirected to {to}</div>;
}

/**
 * If the user is logged in, it displays
 * the balance, otherwise it offers to login.
 */
export function BankHome(): VNode {
  const history = createHashHistory();
  return (
    <Router history={history}>
      <Route path="/public-accounts" component={PublicHistoriesPage} />
      <Route path="/register" component={RegistrationPage} />
      <Route path="/account/:id*" component={AccountPage} />
      <Route default component={Redirect} to="/account" />
    </Router>
  );
}
