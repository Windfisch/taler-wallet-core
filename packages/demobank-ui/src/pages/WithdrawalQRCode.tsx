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
import { Fragment, h, VNode } from "preact";
import useSWR from "swr";
import { PageStateType, usePageContext } from "../context/pageState.js";
import { useTranslationContext } from "@gnu-taler/web-util/lib/index.browser";
import { QrCodeSection } from "./QrCodeSection.js";
import { WithdrawalConfirmationQuestion } from "./WithdrawalConfirmationQuestion.js";

const logger = new Logger("WithdrawalQRCode");
/**
 * Offer the QR code (and a clickable taler://-link) to
 * permit the passing of exchange and reserve details to
 * the bank.  Poll the backend until such operation is done.
 */
export function WithdrawalQRCode({
  withdrawalId,
  talerWithdrawUri,
}: {
  withdrawalId: string;
  talerWithdrawUri: string;
}): VNode {
  // turns true when the wallet POSTed the reserve details:
  const { pageState, pageStateSetter } = usePageContext();
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

  logger.trace(`Showing withdraw URI: ${talerWithdrawUri}`);
  // waiting for the wallet:

  const { data, error } = useSWR(
    `integration-api/withdrawal-operation/${withdrawalId}`,
    { refreshInterval: 1000 },
  );

  if (typeof error !== "undefined") {
    logger.error(
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
  logger.trace("withdrawal status", data);
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
  return <WithdrawalConfirmationQuestion />;
}
