import { Fragment, h, VNode } from "preact";
import useSWR from "swr";
import { PageStateType, usePageContext } from "../../context/pageState.js";
import { useTranslationContext } from "../../context/translation.js";
import { QrCodeSection } from "./QrCodeSection.js";
import { TalerWithdrawalConfirmationQuestion } from "./TalerWithdrawalConfirmationQuestion.js";

/**
 * Offer the QR code (and a clickable taler://-link) to
 * permit the passing of exchange and reserve details to
 * the bank.  Poll the backend until such operation is done.
 */
export function TalerWithdrawalQRCode(Props: any): VNode {
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
