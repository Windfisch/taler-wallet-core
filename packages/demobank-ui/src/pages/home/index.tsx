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
import { h, Fragment, VNode } from "preact";
import useSWR, { SWRConfig, useSWRConfig } from "swr";

import { Amounts, HttpStatusCode, parsePaytoUri } from "@gnu-taler/taler-util";
import { hooks } from "@gnu-taler/web-util/lib/index.browser";
import { route } from "preact-router";
import { StateUpdater, useEffect, useRef, useState } from "preact/hooks";
import { PageStateType, usePageContext } from "../../context/pageState.js";
import { useTranslationContext } from "../../context/translation.js";
import { BackendStateType, useBackendState } from "../../hooks/backend.js";
import { bankUiSettings } from "../../settings.js";
import { QrCodeSection } from "./QrCodeSection.js";
import {
  getBankBackendBaseUrl,
  getIbanFromPayto,
  undefinedIfEmpty,
  validateAmount,
} from "../../utils.js";
import { BankFrame } from "./BankFrame.js";
import { Transactions } from "./Transactions.js";
import { ShowInputErrorLabel } from "./ShowInputErrorLabel.js";

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

/************
 * Helpers. *
 ***********/

/**
 * Get username from the backend state, and throw
 * exception if not found.
 */
function getUsername(backendState: BackendStateType | undefined): string {
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
  backendState: BackendStateType | undefined,
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
  const ret = hooks.useNotNullLocalStorage("transaction-page", "0");
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

/*******************
 * State managers. *
 ******************/

/**
 * Stores the raw Payto value entered by the user in the state.
 */
type RawPaytoInputType = string;
type RawPaytoInputTypeOpt = RawPaytoInputType | undefined;
function useRawPaytoInputType(
  state?: RawPaytoInputType,
): [RawPaytoInputTypeOpt, StateUpdater<RawPaytoInputTypeOpt>] {
  const ret = hooks.useLocalStorage("raw-payto-input-state", state);
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
  const ret = hooks.useLocalStorage(
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
  backendState: BackendStateType | undefined,
  withdrawalId: string | undefined,
  pageStateSetter: StateUpdater<PageStateType>,
): Promise<void> {
  if (typeof backendState === "undefined") {
    console.log("No credentials found.");
    pageStateSetter((prevState) => ({
      ...prevState,

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
  backendState: BackendStateType | undefined,
  withdrawalId: string | undefined,
  pageStateSetter: StateUpdater<PageStateType>,
): Promise<void> {
  if (typeof backendState === "undefined") {
    console.log("No credentials found.");
    pageStateSetter((prevState) => ({
      ...prevState,

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
  backendState: BackendStateType | undefined,
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
  backendState: BackendStateType | undefined,
  pageStateSetter: StateUpdater<PageStateType>,
): Promise<void> {
  if (typeof backendState === "undefined") {
    console.log("Page has a problem: no credentials found in the state.");
    pageStateSetter((prevState) => ({
      ...prevState,

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
  req: { username: string; password: string },
  /**
   * FIXME: figure out if the two following
   * functions can be retrieved from the state.
   */
  backendStateSetter: StateUpdater<BackendStateType | undefined>,
  pageStateSetter: StateUpdater<PageStateType>,
): Promise<void> {
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

/**************************
 * Functional components. *
 *************************/

function PaytoWireTransfer({
  focus,
  currency,
}: {
  focus?: boolean;
  currency?: string;
}): VNode {
  const [backendState, backendStateSetter] = useBackendState();
  const { pageState, pageStateSetter } = usePageContext(); // NOTE: used for go-back button?

  const [submitData, submitDataSetter] = useWireTransferRequestType();

  const [rawPaytoInput, rawPaytoInputSetter] = useState<string | undefined>(
    undefined,
  );
  const { i18n } = useTranslationContext();
  const ibanRegex = "^[A-Z][A-Z][0-9]+$";
  let transactionData: TransactionRequestType;
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (focus) ref.current?.focus();
  }, [focus, pageState.isRawPayto]);

  let parsedAmount = undefined;

  const errorsWire = {
    iban: !submitData?.iban
      ? i18n.str`Missing IBAN`
      : !/^[A-Z0-9]*$/.test(submitData.iban)
      ? i18n.str`IBAN should have just uppercased letters and numbers`
      : undefined,
    subject: !submitData?.subject ? i18n.str`Missing subject` : undefined,
    amount: !submitData?.amount
      ? i18n.str`Missing amount`
      : !(parsedAmount = Amounts.parse(`${currency}:${submitData.amount}`))
      ? i18n.str`Amount is not valid`
      : Amounts.isZero(parsedAmount)
      ? i18n.str`Should be greater than 0`
      : undefined,
  };

  if (!pageState.isRawPayto)
    return (
      <div>
        <form class="pure-form" name="wire-transfer-form">
          <p>
            <label for="iban">{i18n.str`Receiver IBAN:`}</label>&nbsp;
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
            <label for="subject">{i18n.str`Transfer subject:`}</label>&nbsp;
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
            <label for="amount">{i18n.str`Amount:`}</label>&nbsp;
            <input
              type="text"
              readonly
              class="currency-indicator"
              size={currency?.length}
              maxLength={currency?.length}
              tabIndex={-1}
              value={currency}
            />
            &nbsp;
            <input
              type="number"
              name="amount"
              id="amount"
              placeholder="amount"
              required
              value={submitData?.amount ?? ""}
              onInput={(e): void => {
                submitDataSetter((submitData: any) => ({
                  ...submitData,
                  amount: e.currentTarget.value,
                }));
              }}
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

                    error: {
                      title: i18n.str`Field(s) missing.`,
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
        </form>
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
            {i18n.str`Want to try the raw payto://-format?`}
          </a>
        </p>
      </div>
    );

  const errorsPayto = undefinedIfEmpty({
    rawPaytoInput: !rawPaytoInput
      ? i18n.str`Missing payto address`
      : !parsePaytoUri(rawPaytoInput)
      ? i18n.str`Payto does not follow the pattern`
      : undefined,
  });

  return (
    <div>
      <p>{i18n.str`Transfer money to account identified by payto:// URI:`}</p>
      <div class="pure-form" name="payto-form">
        <p>
          <label for="address">{i18n.str`payto URI:`}</label>&nbsp;
          <input
            name="address"
            type="text"
            size={50}
            ref={ref}
            id="address"
            value={rawPaytoInput ?? ""}
            required
            placeholder={i18n.str`payto address`}
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
            value={i18n.str`Send`}
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
            {i18n.str`Use wire-transfer form?`}
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
  const { pageState, pageStateSetter } = usePageContext();
  const { backendState } = Props;
  const { i18n } = useTranslationContext();
  const captchaNumbers = {
    a: Math.floor(Math.random() * 10),
    b: Math.floor(Math.random() * 10),
  };
  let captchaAnswer = "";

  return (
    <Fragment>
      <h1 class="nav">{i18n.str`Confirm Withdrawal`}</h1>
      <article>
        <div class="challenge-div">
          <form class="challenge-form" noValidate>
            <div class="pure-form" id="captcha" name="capcha-form">
              <h2>{i18n.str`Authorize withdrawal by solving challenge`}</h2>
              <p>
                <label for="answer">
                  {i18n.str`What is`}&nbsp;
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

                      error: {
                        title: i18n.str`Answer is wrong.`,
                      },
                    }));
                  }}
                >
                  {i18n.str`Confirm`}
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
                  {i18n.str`Cancel`}
                </button>
              </p>
            </div>
          </form>
          <div class="hint">
            <p>
              <i18n.Translate>
                A this point, a <b>real</b> bank would ask for an additional
                authentication proof (PIN/TAN, one time password, ..), instead
                of a simple calculation.
              </i18n.Translate>
            </p>
          </div>
        </div>
      </article>
    </Fragment>
  );
}

/**
 * Offer the QR code (and a clickable taler://-link) to
 * permit the passing of exchange and reserve details to
 * the bank.  Poll the backend until such operation is done.
 */
function TalerWithdrawalQRCode(Props: any): VNode {
  // turns true when the wallet POSTed the reserve details:
  const { pageState, pageStateSetter } = usePageContext();
  const { withdrawalId, talerWithdrawUri, backendState } = Props;
  const { i18n } = useTranslationContext();
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
    >{i18n.str`Abort`}</a>
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

      error: {
        title: i18n.str`withdrawal (${withdrawalId}) was never (correctly) created at the bank...`,
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
    return <p>{i18n.str`Waiting the bank to create the operation...`}</p>;

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

        error: {
          title: i18n.str`This withdrawal was aborted!`,
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

function WalletWithdraw({
  focus,
  currency,
}: {
  currency?: string;
  focus?: boolean;
}): VNode {
  const [backendState, backendStateSetter] = useBackendState();
  const { pageState, pageStateSetter } = usePageContext();
  const { i18n } = useTranslationContext();
  let submitAmount = "5.00";

  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (focus) ref.current?.focus();
  }, [focus]);
  return (
    <form id="reserve-form" class="pure-form" name="tform">
      <p>
        <label for="withdraw-amount">{i18n.str`Amount to withdraw:`}</label>
        &nbsp;
        <input
          type="text"
          readonly
          class="currency-indicator"
          size={currency?.length ?? 5}
          maxLength={currency?.length}
          tabIndex={-1}
          value={currency}
        />
        &nbsp;
        <input
          type="number"
          ref={ref}
          id="withdraw-amount"
          name="withdraw-amount"
          value={submitAmount}
          onChange={(e): void => {
            // FIXME: validate using 'parseAmount()',
            // deactivate submit button as long as
            // amount is not valid
            submitAmount = e.currentTarget.value;
          }}
        />
      </p>
      <p>
        <div>
          <input
            id="select-exchange"
            class="pure-button pure-button-primary"
            type="submit"
            value={i18n.str`Withdraw`}
            onClick={() => {
              submitAmount = validateAmount(submitAmount);
              /**
               * By invalid amounts, the validator prints error messages
               * on the console, and the browser colourizes the amount input
               * box to indicate a error.
               */
              if (!submitAmount && currency) return;
              createWithdrawalCall(
                `${currency}:${submitAmount}`,
                backendState,
                pageStateSetter,
              );
            }}
          />
        </div>
      </p>
    </form>
  );
}

/**
 * Let the user choose a payment option,
 * then specify the details trigger the action.
 */
function PaymentOptions({ currency }: { currency?: string }): VNode {
  const { i18n } = useTranslationContext();

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
            {i18n.str`Obtain digital cash`}
          </button>
          <button
            class={tab === "wire-transfer" ? "tablinks active" : "tablinks"}
            onClick={(): void => {
              setTab("wire-transfer");
            }}
          >
            {i18n.str`Transfer to bank account`}
          </button>
        </div>
        {tab === "charge-wallet" && (
          <div id="charge-wallet" class="tabcontent active">
            <h3>{i18n.str`Obtain digital cash`}</h3>
            <WalletWithdraw focus currency={currency} />
          </div>
        )}
        {tab === "wire-transfer" && (
          <div id="wire-transfer" class="tabcontent active">
            <h3>{i18n.str`Transfer to bank account`}</h3>
            <PaytoWireTransfer focus currency={currency} />
          </div>
        )}
      </div>
    </article>
  );
}

/**
 * Collect and submit login data.
 */
function LoginForm(): VNode {
  const [backendState, backendStateSetter] = useBackendState();
  const { pageState, pageStateSetter } = usePageContext();
  const [username, setUsername] = useState<string | undefined>();
  const [password, setPassword] = useState<string | undefined>();
  const { i18n } = useTranslationContext();
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);

  const errors = undefinedIfEmpty({
    username: !username ? i18n.str`Missing username` : undefined,
    password: !password ? i18n.str`Missing password` : undefined,
  });

  return (
    <div class="login-div">
      <form action="javascript:void(0);" class="login-form" noValidate>
        <div class="pure-form">
          <h2>{i18n.str`Please login!`}</h2>
          <p class="unameFieldLabel loginFieldLabel formFieldLabel">
            <label for="username">{i18n.str`Username:`}</label>
          </p>
          <input
            ref={ref}
            autoFocus
            type="text"
            name="username"
            id="username"
            value={username ?? ""}
            placeholder="Username"
            required
            onInput={(e): void => {
              setUsername(e.currentTarget.value);
            }}
          />
          <ShowInputErrorLabel
            message={errors?.username}
            isDirty={username !== undefined}
          />
          <p class="passFieldLabel loginFieldLabel formFieldLabel">
            <label for="password">{i18n.str`Password:`}</label>
          </p>
          <input
            type="password"
            name="password"
            id="password"
            value={password ?? ""}
            placeholder="Password"
            required
            onInput={(e): void => {
              setPassword(e.currentTarget.value);
            }}
          />
          <ShowInputErrorLabel
            message={errors?.password}
            isDirty={password !== undefined}
          />
          <br />
          <button
            type="submit"
            class="pure-button pure-button-primary"
            disabled={!!errors}
            onClick={() => {
              if (!username || !password) return;
              loginCall(
                { username, password },
                backendStateSetter,
                pageStateSetter,
              );
              setUsername(undefined);
              setPassword(undefined);
            }}
          >
            {i18n.str`Login`}
          </button>

          {bankUiSettings.allowRegistrations ? (
            <button
              class="pure-button pure-button-secondary btn-cancel"
              onClick={() => {
                route("/register");
              }}
            >
              {i18n.str`Register`}
            </button>
          ) : (
            <div />
          )}
        </div>
      </form>
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
  const { pageState, pageStateSetter: setPageState } = usePageContext();
  const {
    withdrawalInProgress,
    withdrawalId,
    isLoggedIn,
    talerWithdrawUri,
    timestamp,
  } = pageState;
  const { i18n } = useTranslationContext();
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

          isLoggedIn: false,
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
        setPageState((prevState: PageStateType) => ({
          ...prevState,

          isLoggedIn: false,
          error: {
            title: i18n.str`Wrong credentials given.`,
          },
        }));
        return <p>Wrong credentials...</p>;
      }
      default: {
        setPageState((prevState: PageStateType) => ({
          ...prevState,

          isLoggedIn: false,
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

export function AccountPage(): VNode {
  const [backendState, backendStateSetter] = useBackendState();
  const { i18n } = useTranslationContext();
  const { pageState, pageStateSetter } = usePageContext();

  if (!pageState.isLoggedIn) {
    return (
      <BankFrame>
        <h1 class="nav">{i18n.str`Welcome to ${bankUiSettings.bankName}!`}</h1>
        <LoginForm />
      </BankFrame>
    );
  }

  if (typeof backendState === "undefined") {
    pageStateSetter((prevState) => ({
      ...prevState,

      isLoggedIn: false,
      error: {
        title: i18n.str`Page has a problem: logged in but backend state is lost.`,
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
      <Account
        accountLabel={backendState.username}
        backendState={backendState}
      />
    </SWRWithCredentials>
  );
}
