import { i18n } from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";
import { useState } from "preact/hooks";
import { Button, ButtonSuccess, ButtonWarning } from "../components/styled";
import { TermsOfServiceSection } from "../cta/TermsOfServiceSection";
import { useAsyncAsHook } from "../hooks/useAsyncAsHook";
import { buildTermsOfServiceState, TermsState } from "../utils/index";
import * as wxApi from "../wxApi";

export interface Props {
  url: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ExchangeAddConfirmPage({
  url,
  onCancel,
  onConfirm,
}: Props): VNode {
  const detailsHook = useAsyncAsHook(async () => {
    const tos = await wxApi.getExchangeTos(url, ["text/xml"]);

    const tosState = buildTermsOfServiceState(tos);

    return { tos: tosState };
  });

  const termsNotFound: TermsState = {
    status: "notfound",
    version: "",
    content: undefined,
  };
  const terms = !detailsHook
    ? undefined
    : detailsHook.hasError
    ? termsNotFound
    : detailsHook.response.tos;

  // const [errorAccepting, setErrorAccepting] = useState<string | undefined>(
  //   undefined,
  // );

  const onAccept = async (): Promise<void> => {
    if (!terms) return;
    try {
      await wxApi.setExchangeTosAccepted(url, terms.version);
    } catch (e) {
      if (e instanceof Error) {
        // setErrorAccepting(e.message);
      }
    }
  };
  return (
    <View
      url={url}
      onAccept={onAccept}
      onCancel={onCancel}
      onConfirm={onConfirm}
      terms={terms}
    />
  );
}

export interface ViewProps {
  url: string;
  terms: TermsState | undefined;
  onAccept: (b: boolean) => Promise<void>;
  onCancel: () => void;
  onConfirm: () => void;
}

export function View({
  url,
  terms,
  onAccept: doAccept,
  onConfirm,
  onCancel,
}: ViewProps): VNode {
  const needsReview =
    !terms || terms.status === "changed" || terms.status === "new";
  const [reviewed, setReviewed] = useState<boolean>(false);

  return (
    <Fragment>
      <section>
        <h1>Review terms of service</h1>
        <div>
          Exchange URL:
          <a href={url} target="_blank" rel="noreferrer">
            {url}
          </a>
        </div>
      </section>
      {terms && (
        <TermsOfServiceSection
          reviewed={reviewed}
          reviewing={true}
          terms={terms}
          onAccept={(value) =>
            doAccept(value).then(() => {
              setReviewed(value);
            })
          }
        />
      )}

      <footer>
        <Button onClick={onCancel}>
          <i18n.Translate>Cancel</i18n.Translate>
        </Button>
        {!terms && (
          <Button disabled>
            <i18n.Translate>Loading terms..</i18n.Translate>
          </Button>
        )}
        {terms && (
          <Fragment>
            {needsReview && !reviewed && (
              <ButtonSuccess disabled upperCased onClick={onConfirm}>
                {i18n.str`Add exchange`}
              </ButtonSuccess>
            )}
            {(terms.status === "accepted" || (needsReview && reviewed)) && (
              <ButtonSuccess upperCased onClick={onConfirm}>
                {i18n.str`Add exchange`}
              </ButtonSuccess>
            )}
            {terms.status === "notfound" && (
              <ButtonWarning upperCased onClick={onConfirm}>
                {i18n.str`Add exchange anyway`}
              </ButtonWarning>
            )}
          </Fragment>
        )}
      </footer>
    </Fragment>
  );
}
