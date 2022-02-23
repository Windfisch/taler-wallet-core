import {
  AmountJson,
  Amounts,
  parsePaytoUri,
  Translate,
} from "@gnu-taler/taler-util";
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
        <Translate>could not parse payto uri from exchange {payto}</Translate>
      </div>
    );
  }
  return (
    <Fragment>
      <section>
        <h1>
          <Translate>Exchange is ready for withdrawal</Translate>
        </h1>
        <p>
          <Translate>
            To complete the process you need to wire
            <b>{amountToString(amount)}</b> to the exchange bank account
          </Translate>
        </p>
        <BankDetailsByPaytoType
          amount={amountToString(amount)}
          exchangeBaseUrl={exchangeBaseUrl}
          payto={paytoURI}
          subject={reservePub}
        />
        <p>
          <WarningBox>
            <Translate>
              Make sure to use the correct subject, otherwise the money will not
              arrive in this wallet.
            </Translate>
          </WarningBox>
        </p>
      </section>
      <section>
        <p>
          <Translate>
            Alternative, you can also scan this QR code or open
            <a href={payto}>this link</a> if you have a banking app installed
            that supports RFC 8905
          </Translate>
        </p>
        <QR text={payto} />
      </section>
      <footer>
        <div />
        <ButtonDestructive onClick={onCancel}>
          <Translate>Cancel withdrawal</Translate>
        </ButtonDestructive>
      </footer>
    </Fragment>
  );
}
