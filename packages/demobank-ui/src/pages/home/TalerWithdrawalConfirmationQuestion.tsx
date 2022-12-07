import { Fragment, h, VNode } from "preact";
import { StateUpdater } from "preact/hooks";
import { PageStateType, usePageContext } from "../../context/pageState.js";
import { useTranslationContext } from "../../context/translation.js";
import { BackendStateType } from "../../hooks/backend.js";
import { prepareHeaders } from "../../utils.js";

/**
 * Additional authentication required to complete the operation.
 * Not providing a back button, only abort.
 */
export function TalerWithdrawalConfirmationQuestion(Props: any): VNode {
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
