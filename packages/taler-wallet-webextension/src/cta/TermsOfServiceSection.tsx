import { i18n } from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";
import { CheckboxOutlined } from "../components/CheckboxOutlined";
import { ExchangeXmlTos } from "../components/ExchangeToS";
import {
  ButtonSuccess,
  ButtonWarning,
  LinkSuccess,
  TermsOfService,
  WarningBox,
} from "../components/styled";
import { TermsState } from "../utils";

interface Props {
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
  if (!reviewing) {
    if (!reviewed) {
      if (!onReview) {
        return <section>Terms of service status: {terms.status}</section>;
      }
      return (
        <Fragment>
          {terms.status === "new" && (
            <section>
              <ButtonSuccess upperCased onClick={() => onReview(true)}>
                {i18n.str`Review exchange terms of service`}
              </ButtonSuccess>
            </section>
          )}
          {terms.status === "changed" && (
            <section>
              <ButtonWarning upperCased onClick={() => onReview(true)}>
                {i18n.str`Review new version of terms of service`}
              </ButtonWarning>
            </section>
          )}
        </Fragment>
      );
    }
    return (
      <Fragment>
        {onReview && (
          <section>
            <LinkSuccess upperCased onClick={() => onReview(true)}>
              {i18n.str`Show terms of service`}
            </LinkSuccess>
          </section>
        )}
        <section>
          <CheckboxOutlined
            name="terms"
            enabled={reviewed}
            label={i18n.str`I accept the exchange terms of service`}
            onToggle={() => {
              console.log("asdasd", reviewed);
              onAccept(!reviewed);
              if (onReview) onReview(false);
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
            The exchange reply with a empty terms of service
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
              Download Terms of Service
            </a>
          )}
        </section>
      )}
      {reviewed && onReview && (
        <section>
          <LinkSuccess upperCased onClick={() => onReview(false)}>
            {i18n.str`Hide terms of service`}
          </LinkSuccess>
        </section>
      )}
      {terms.status !== "notfound" && (
        <section>
          <CheckboxOutlined
            name="terms"
            enabled={reviewed}
            label={i18n.str`I accept the exchange terms of service`}
            onToggle={() => {
              onAccept(!reviewed);
              if (onReview) onReview(false);
            }}
          />
        </section>
      )}
    </Fragment>
  );
}
