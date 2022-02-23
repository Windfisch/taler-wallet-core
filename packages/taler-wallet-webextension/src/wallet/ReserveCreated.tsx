import { AmountJson, parsePaytoUri, i18n } from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";
import { BankDetailsByPaytoType } from "../components/BankDetailsByPaytoType";
import { QR } from "../components/QR";
import { ButtonDestructive, WarningBox } from "../components/styled";
import { amountToString } from "../utils/index";
export interface Props {
  reservePub: string;
  payto: string;
  exchangeBaseUrl: string;
  amount: AmountJson;
  onCancel: () => void;
}

export function ReserveCreated({
  reservePub,
  payto,
  onCancel,
  exchangeBaseUrl,
  amount,
}: Props): VNode {
  const paytoURI = parsePaytoUri(payto);
  // const url = new URL(paytoURI?.targetPath);
  if (!paytoURI) {
    return (
      <div>
        <i18n.Translate>
          could not parse payto uri from exchange {payto}
        </i18n.Translate>
      </div>
    );
  }
  return (
    <Fragment>
      <section>
        <h1>
          <i18n.Translate>Exchange is ready for withdrawal</i18n.Translate>
        </h1>
        <p>
          <i18n.Translate>
            To complete the process you need to wire
            <b>{amountToString(amount)}</b> to the exchange bank account
          </i18n.Translate>
        </p>
        <BankDetailsByPaytoType
          amount={amountToString(amount)}
          exchangeBaseUrl={exchangeBaseUrl}
          payto={paytoURI}
          subject={reservePub}
        />
        <p>
          <WarningBox>
            <i18n.Translate>
              Make sure to use the correct subject, otherwise the money will not
              arrive in this wallet.
            </i18n.Translate>
          </WarningBox>
        </p>
      </section>
      <section>
        <p>
          <i18n.Translate>
            Alternative, you can also scan this QR code or open
            <a href={payto}>this link</a> if you have a banking app installed
            that supports RFC 8905
          </i18n.Translate>
        </p>
        <QR text={payto} />
      </section>
      <footer>
        <div />
        <ButtonDestructive onClick={onCancel}>
          <i18n.Translate>Cancel withdrawal</i18n.Translate>
        </ButtonDestructive>
      </footer>
    </Fragment>
  );
}
