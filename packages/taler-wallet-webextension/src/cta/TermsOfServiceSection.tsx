import { Fragment, h, VNode } from "preact";
import { CheckboxOutlined } from "../components/CheckboxOutlined.js";
import { ExchangeXmlTos } from "../components/ExchangeToS.js";
import {
  ButtonSuccess,
  ButtonWarning,
  LinkSuccess,
  TermsOfService,
  WarningBox,
  WarningText,
} from "../components/styled/index.js";
import { useTranslationContext } from "../context/translation.js";
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
              <section>
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
            <section>
              <WarningText>
                <i18n.Translate>
                  Exchange doesn&apos;t have terms of service
                </i18n.Translate>
              </WarningText>
            </section>
          )}
          {terms.status === "new" && (
            <section>
              <ButtonSuccess upperCased onClick={() => onReview(true)}>
                <i18n.Translate>
                  Review exchange terms of service
                </i18n.Translate>
              </ButtonSuccess>
            </section>
          )}
          {terms.status === "changed" && (
            <section>
              <ButtonWarning upperCased onClick={() => onReview(true)}>
                <i18n.Translate>
                  Review new version of terms of service
                </i18n.Translate>
              </ButtonWarning>
            </section>
          )}
        </Fragment>
      );
    }
    return (
      <Fragment>
        {ableToReviewTermsOfService && (
          <section>
            <LinkSuccess upperCased onClick={() => onReview(true)}>
              <i18n.Translate>Show terms of service</i18n.Translate>
            </LinkSuccess>
          </section>
        )}
        <section>
          <CheckboxOutlined
            name="terms"
            enabled={reviewed}
            label={
              <i18n.Translate>
                I accept the exchange terms of service
              </i18n.Translate>
            }
            onToggle={() => {
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
        <section>
          <WarningBox>
            <i18n.Translate>
              The exchange reply with a empty terms of service
            </i18n.Translate>
          </WarningBox>
        </section>
      )}
      {terms.status !== "accepted" && terms.content && (
        <section>
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
        <section>
          <LinkSuccess upperCased onClick={() => onReview(false)}>
            <i18n.Translate>Hide terms of service</i18n.Translate>
          </LinkSuccess>
        </section>
      )}
      {terms.status !== "notfound" && (
        <section>
          <CheckboxOutlined
            name="terms"
            enabled={reviewed}
            label={
              <i18n.Translate>
                I accept the exchange terms of service
              </i18n.Translate>
            }
            onToggle={() => {
              onAccept(!reviewed);
              if (ableToReviewTermsOfService) onReview(false);
            }}
          />
        </section>
      )}
    </Fragment>
  );
}
