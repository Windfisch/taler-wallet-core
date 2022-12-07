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
import { h, VNode } from "preact";
import { StateUpdater, useEffect, useRef } from "preact/hooks";
import { useBackendContext } from "../../context/backend.js";
import { PageStateType, usePageContext } from "../../context/pageState.js";
import { useTranslationContext } from "../../context/translation.js";
import { BackendState } from "../../hooks/backend.js";
import { prepareHeaders, validateAmount } from "../../utils.js";

const logger = new Logger("WalletWithdrawForm");

export function WalletWithdrawForm({
  focus,
  currency,
}: {
  currency?: string;
  focus?: boolean;
}): VNode {
  const backend = useBackendContext();
  const { pageState, pageStateSetter } = usePageContext();
  const { i18n } = useTranslationContext();
  let submitAmount: string | undefined = "5.00";

  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (focus) ref.current?.focus();
  }, [focus]);
  return (
    <form id="reserve-form" class="pure-form" name="tform">
      <p>
        <label for="withdraw-amount">{i18n.str`Amount to withdraw:`}</label>
        &nbsp;
        <div style={{ width: "max-content" }}>
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
        </div>
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
                backend.state,
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
  backendState: BackendState,
  pageStateSetter: StateUpdater<PageStateType>,
): Promise<void> {
  if (backendState?.status === "loggedOut") {
    logger.error("Page has a problem: no credentials found in the state.");
    pageStateSetter((prevState) => ({
      ...prevState,

      error: {
        title: "No credentials given.",
      },
    }));
    return;
  }

  let res: Response;
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
    logger.trace("Could not POST withdrawal request to the bank", error);
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
    logger.error(
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

  logger.trace("Withdrawal operation created!");
  const resp = await res.json();
  pageStateSetter((prevState: PageStateType) => ({
    ...prevState,
    withdrawalInProgress: true,
    talerWithdrawUri: resp.taler_withdraw_uri,
    withdrawalId: resp.withdrawal_id,
  }));
}
