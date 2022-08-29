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
import { CheckboxOutlined } from "../components/CheckboxOutlined.js";
import { ExchangeXmlTos } from "../components/ExchangeToS.js";
import {
  LinkSuccess,
  TermsOfService,
  WarningBox,
  WarningText,
} from "../components/styled/index.js";
import { useTranslationContext } from "../context/translation.js";
import { Button } from "../mui/Button.js";
import { TermsState } from "../utils/index.js";

export interface Props {
  reviewing: boolean;
  reviewed: boolean;
  terms: TermsState;
  onReview?: (b: boolean) => void;
  onAccept: (b: boolean) => void;
}
export function TermsOfServiceSection({
  reviewed,
  reviewing,
  terms,
  onAccept,
  onReview,
}: Props): VNode {
  const { i18n } = useTranslationContext();
  const ableToReviewTermsOfService = onReview !== undefined;
  if (!reviewing) {
    if (!reviewed) {
      if (!ableToReviewTermsOfService) {
        return (
          <Fragment>
            {terms.status === "notfound" && (
              <section
                style={{ justifyContent: "space-around", display: "flex" }}
              >
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
            <section
              style={{ justifyContent: "space-around", display: "flex" }}
            >
              <WarningText>
                <i18n.Translate>
                  Exchange doesn&apos;t have terms of service
                </i18n.Translate>
              </WarningText>
            </section>
          )}
          {terms.status === "new" && (
            <section
              style={{ justifyContent: "space-around", display: "flex" }}
            >
              <Button
                variant="contained"
                color="success"
                onClick={async () => onReview(true)}
              >
                <i18n.Translate>
                  Review exchange terms of service
                </i18n.Translate>
              </Button>
            </section>
          )}
          {terms.status === "changed" && (
            <section
              style={{ justifyContent: "space-around", display: "flex" }}
            >
              <Button
                variant="contained"
                color="success"
                onClick={async () => onReview(true)}
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
    return (
      <Fragment>
        {ableToReviewTermsOfService && (
          <section style={{ justifyContent: "space-around", display: "flex" }}>
            <LinkSuccess upperCased onClick={() => onReview(true)}>
              <i18n.Translate>Show terms of service</i18n.Translate>
            </LinkSuccess>
          </section>
        )}
        <section style={{ justifyContent: "space-around", display: "flex" }}>
          <CheckboxOutlined
            name="terms"
            enabled={reviewed}
            label={
              <i18n.Translate>
                I accept the exchange terms of service
              </i18n.Translate>
            }
            onToggle={async () => {
              onAccept(!reviewed);
              if (ableToReviewTermsOfService) onReview(false);
            }}
          />
        </section>
      </Fragment>
    );
  }
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
      {terms.status !== "accepted" && terms.content && (
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
      {reviewed && ableToReviewTermsOfService && (
        <section style={{ justifyContent: "space-around", display: "flex" }}>
          <LinkSuccess upperCased onClick={() => onReview(false)}>
            <i18n.Translate>Hide terms of service</i18n.Translate>
          </LinkSuccess>
        </section>
      )}
      {terms.status !== "notfound" && (
        <section style={{ justifyContent: "space-around", display: "flex" }}>
          <CheckboxOutlined
            name="terms"
            enabled={reviewed}
            label={
              <i18n.Translate>
                I accept the exchange terms of service
              </i18n.Translate>
            }
            onToggle={async () => {
              onAccept(!reviewed);
              if (ableToReviewTermsOfService) onReview(false);
            }}
          />
        </section>
      )}
    </Fragment>
  );
}
