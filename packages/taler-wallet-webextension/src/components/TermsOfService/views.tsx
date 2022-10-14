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
import { LoadingError } from "../../components/LoadingError.js";
import { useTranslationContext } from "../../context/translation.js";
import { TermsDocument, TermsState } from "./utils.js";
import { State } from "./index.js";
import { CheckboxOutlined } from "../../components/CheckboxOutlined.js";
import {
  LinkSuccess,
  TermsOfService,
  WarningBox,
  WarningText,
} from "../../components/styled/index.js";
import { ExchangeXmlTos } from "../../components/ExchangeToS.js";
import { ToggleHandler } from "../../mui/handlers.js";
import { Button } from "../../mui/Button.js";

export function LoadingUriView({ error }: State.LoadingUriError): VNode {
  const { i18n } = useTranslationContext();

  return (
    <LoadingError
      title={<i18n.Translate>Could not load</i18n.Translate>}
      error={error}
    />
  );
}

export function ErrorAcceptingView({ error }: State.ErrorAccepting): VNode {
  const { i18n } = useTranslationContext();

  return (
    <LoadingError
      title={<i18n.Translate>Could not load</i18n.Translate>}
      error={error}
    />
  );
}

export function ShowButtonsAcceptedTosView({
  termsAccepted,
  showingTermsOfService,
  terms,
}: State.ShowButtonsAccepted): VNode {
  const { i18n } = useTranslationContext();
  const ableToReviewTermsOfService =
    showingTermsOfService.button.onClick !== undefined;

  return (
    <Fragment>
      {ableToReviewTermsOfService && (
        <section style={{ justifyContent: "space-around", display: "flex" }}>
          <LinkSuccess
            upperCased
            onClick={showingTermsOfService.button.onClick}
          >
            <i18n.Translate>Show terms of service</i18n.Translate>
          </LinkSuccess>
        </section>
      )}
      <section style={{ justifyContent: "space-around", display: "flex" }}>
        <CheckboxOutlined
          name="terms"
          enabled={termsAccepted.value}
          label={
            <i18n.Translate>
              I accept the exchange terms of service
            </i18n.Translate>
          }
          onToggle={termsAccepted.button.onClick}
        />
      </section>
    </Fragment>
  );
}

export function ShowButtonsNonAcceptedTosView({
  showingTermsOfService,
  terms,
}: State.ShowButtonsNotAccepted): VNode {
  const { i18n } = useTranslationContext();
  const ableToReviewTermsOfService =
    showingTermsOfService.button.onClick !== undefined;

  if (!ableToReviewTermsOfService) {
    return (
      <Fragment>
        {terms.status === "notfound" && (
          <section style={{ justifyContent: "space-around", display: "flex" }}>
            <WarningText>
              <i18n.Translate>
                Exchange doesn&apos;t have terms of service
              </i18n.Translate>
            </WarningText>
          </section>
        )}
      </Fragment>
    );
  }

  return (
    <Fragment>
      {terms.status === "notfound" && (
        <section style={{ justifyContent: "space-around", display: "flex" }}>
          <WarningText>
            <i18n.Translate>
              Exchange doesn&apos;t have terms of service
            </i18n.Translate>
          </WarningText>
        </section>
      )}
      {terms.status === "new" && (
        <section style={{ justifyContent: "space-around", display: "flex" }}>
          <Button
            variant="contained"
            color="success"
            onClick={showingTermsOfService.button.onClick}
          >
            <i18n.Translate>Review exchange terms of service</i18n.Translate>
          </Button>
        </section>
      )}
      {terms.status === "changed" && (
        <section style={{ justifyContent: "space-around", display: "flex" }}>
          <Button
            variant="contained"
            color="success"
            onClick={showingTermsOfService.button.onClick}
          >
            <i18n.Translate>
              Review new version of terms of service
            </i18n.Translate>
          </Button>
        </section>
      )}
    </Fragment>
  );
}

export function ShowTosContentView({
  termsAccepted,
  showingTermsOfService,
  terms,
}: State.ShowContent): VNode {
  const { i18n } = useTranslationContext();
  const ableToReviewTermsOfService =
    showingTermsOfService?.button.onClick !== undefined;

  return (
    <Fragment>
      {terms.status !== "notfound" && !terms.content && (
        <section style={{ justifyContent: "space-around", display: "flex" }}>
          <WarningBox>
            <i18n.Translate>
              The exchange reply with a empty terms of service
            </i18n.Translate>
          </WarningBox>
        </section>
      )}
      {terms.content && (
        <section style={{ justifyContent: "space-around", display: "flex" }}>
          {terms.content.type === "xml" && (
            <TermsOfService>
              <ExchangeXmlTos doc={terms.content.document} />
            </TermsOfService>
          )}
          {terms.content.type === "plain" && (
            <div style={{ textAlign: "left" }}>
              <pre>{terms.content.content}</pre>
            </div>
          )}
          {terms.content.type === "html" && (
            <iframe src={terms.content.href.toString()} />
          )}
          {terms.content.type === "pdf" && (
            <a href={terms.content.location.toString()} download="tos.pdf">
              <i18n.Translate>Download Terms of Service</i18n.Translate>
            </a>
          )}
        </section>
      )}
      {showingTermsOfService && ableToReviewTermsOfService && (
        <section style={{ justifyContent: "space-around", display: "flex" }}>
          <LinkSuccess
            upperCased
            onClick={showingTermsOfService.button.onClick}
          >
            <i18n.Translate>Hide terms of service</i18n.Translate>
          </LinkSuccess>
        </section>
      )}
      {termsAccepted && terms.status !== "notfound" && (
        <section style={{ justifyContent: "space-around", display: "flex" }}>
          <CheckboxOutlined
            name="terms"
            enabled={termsAccepted.value}
            label={
              <i18n.Translate>
                I accept the exchange terms of service
              </i18n.Translate>
            }
            onToggle={termsAccepted.button.onClick}
          />
        </section>
      )}
    </Fragment>
  );
}
