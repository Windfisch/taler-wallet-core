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

import { Amounts, parsePaytoUri } from "@gnu-taler/taler-util";
import { hooks } from "@gnu-taler/web-util/lib/index.browser";
import { h, VNode } from "preact";
import { StateUpdater, useEffect, useRef, useState } from "preact/hooks";
import { useBackendContext } from "../../context/backend.js";
import { PageStateType, usePageContext } from "../../context/pageState.js";
import { useTranslationContext } from "../../context/translation.js";
import { BackendState } from "../../hooks/backend.js";
import { prepareHeaders, undefinedIfEmpty } from "../../utils.js";
import { ShowInputErrorLabel } from "./ShowInputErrorLabel.js";

export function PaytoWireTransferForm({
  focus,
  currency,
}: {
  focus?: boolean;
  currency?: string;
}): VNode {
  const backend = useBackendContext();
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
                submitDataSetter((submitData) => ({
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
                submitDataSetter((submitData) => ({
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
                submitDataSetter((submitData) => ({
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
                  backend.state,
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
              pageStateSetter((prevState) => ({
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
                backend.state,
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
              pageStateSetter((prevState) => ({
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
 * This function creates a new transaction.  It reads a Payto
 * address entered by the user and POSTs it to the bank.  No
 * sanity-check of the input happens before the POST as this is
 * already conducted by the backend.
 */
async function createTransactionCall(
  req: TransactionRequestType,
  backendState: BackendState,
  pageStateSetter: StateUpdater<PageStateType>,
  /**
   * Optional since the raw payto form doesn't have
   * a stateful management of the input data yet.
   */
  cleanUpForm: () => void,
): Promise<void> {
  if (backendState.status === "loggedOut") {
    console.log("No credentials found.");
    pageStateSetter((prevState) => ({
      ...prevState,

      error: {
        title: "No credentials found.",
      },
    }));
    return;
  }
  let res: Response;
  try {
    const { username, password } = backendState;
    const headers = prepareHeaders(username, password);
    const url = new URL(
      `access-api/accounts/${backendState.username}/transactions`,
      backendState.url,
    );
    res = await fetch(url.href, {
      method: "POST",
      headers,
      body: JSON.stringify(req),
    });
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
