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
import { Fragment, h, VNode } from "preact";
import { useState } from "preact/hooks";
import { Title } from "../components/styled/index.js";
import { useTranslationContext } from "../context/translation.js";
import { TermsOfServiceSection } from "../cta/TermsOfServiceSection.js";
import { useAsyncAsHook } from "../hooks/useAsyncAsHook.js";
import { Button } from "../mui/Button.js";
import { buildTermsOfServiceState, TermsState } from "../utils/index.js";
import * as wxApi from "../wxApi.js";

export interface Props {
  url: string;
  onCancel: () => Promise<void>;
  onConfirm: () => Promise<void>;
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
  onCancel: () => Promise<void>;
  onConfirm: () => Promise<void>;
}

export function View({
  url,
  terms,
  onAccept: doAccept,
  onConfirm,
  onCancel,
}: ViewProps): VNode {
  const { i18n } = useTranslationContext();
  const needsReview =
    !terms || terms.status === "changed" || terms.status === "new";
  const [reviewed, setReviewed] = useState<boolean>(false);

  return (
    <Fragment>
      <section>
        <Title>
          <i18n.Translate>Review terms of service</i18n.Translate>
        </Title>
        <div>
          <i18n.Translate>Exchange URL</i18n.Translate>:
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
        <Button variant="contained" color="secondary" onClick={onCancel}>
          <i18n.Translate>Cancel</i18n.Translate>
        </Button>
        {!terms && (
          <Button variant="contained" disabled>
            <i18n.Translate>Loading terms..</i18n.Translate>
          </Button>
        )}
        {terms && (
          <Fragment>
            {needsReview && !reviewed && (
              <Button
                variant="contained"
                color="success"
                disabled
                onClick={onConfirm}
              >
                <i18n.Translate>Add exchange</i18n.Translate>
              </Button>
            )}
            {(terms.status === "accepted" || (needsReview && reviewed)) && (
              <Button variant="contained" color="success" onClick={onConfirm}>
                <i18n.Translate>Add exchange</i18n.Translate>
              </Button>
            )}
            {terms.status === "notfound" && (
              <Button variant="contained" color="warning" onClick={onConfirm}>
                <i18n.Translate>Add exchange anyway</i18n.Translate>
              </Button>
            )}
          </Fragment>
        )}
      </footer>
    </Fragment>
  );
}
