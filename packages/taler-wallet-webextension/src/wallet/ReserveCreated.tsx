import {
  AmountJson,
  Amounts,
  PaytoUri,
  segwitMinAmount,
  stringifyPaytoUri,
} from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";
import { Amount } from "../components/Amount.js";
import { BankDetailsByPaytoType } from "../components/BankDetailsByPaytoType.js";
import { ErrorMessage } from "../components/ErrorMessage.js";
import { QR } from "../components/QR.js";
import {
  ButtonDestructive,
  Title,
  WarningBox,
} from "../components/styled/index.js";
import { useTranslationContext } from "../context/translation.js";
export interface Props {
  reservePub: string;
  paytoURI: PaytoUri | undefined;
  exchangeBaseUrl: string;
  amount: AmountJson;
  onCancel: () => void;
}

export function ReserveCreated({
  reservePub,
  paytoURI,
  onCancel,
  exchangeBaseUrl,
  amount,
}: Props): VNode {
  const { i18n } = useTranslationContext();
  if (!paytoURI) {
    return (
      <ErrorMessage
        title={<i18n.Translate>Could not parse the payto URI</i18n.Translate>}
        description={<i18n.Translate>Please check the uri</i18n.Translate>}
      />
    );
  }
  function TransferDetails(): VNode {
    if (!paytoURI) return <Fragment />;
    if (paytoURI.isKnown && paytoURI.targetType === "bitcoin") {
      const min = segwitMinAmount();
      return (
        <section>
          <p>
            <i18n.Translate>
              Bitcoin exchange need a transaction with 3 output, one output is
              the exchange account and the other two are segwit fake address for
              metadata with an minimum amount. Reserve pub : {reservePub}
            </i18n.Translate>
          </p>
          <p>
            <i18n.Translate>
              In bitcoincore wallet use &apos;Add Recipient&apos; button to add
              two additional recipient and copy addresses and amounts
            </i18n.Translate>
            <ul>
              <li>
                {paytoURI.targetPath} {Amounts.stringifyValue(amount)} BTC
              </li>
              <li>
                {paytoURI.addr1} {Amounts.stringifyValue(min)} BTC
              </li>
              <li>
                {paytoURI.addr2} {Amounts.stringifyValue(min)} BTC
              </li>
            </ul>
            <i18n.Translate>
              In Electrum wallet paste the following three lines in &apos;Pay
              to&apos; field :
            </i18n.Translate>
            <ul>
              <li>
                {paytoURI.targetPath},{Amounts.stringifyValue(amount)}
              </li>
              <li>
                {paytoURI.addr1},{Amounts.stringifyValue(min)}
              </li>
              <li>
                {paytoURI.addr2},{Amounts.stringifyValue(min)}
              </li>
            </ul>
            <i18n.Translate>
              Make sure the amount show{" "}
              {Amounts.stringifyValue(Amounts.sum([amount, min, min]).amount)}{" "}
              BTC, else you have to change the base unit to BTC
            </i18n.Translate>
          </p>
        </section>
      );
    }
    return (
      <section>
        <BankDetailsByPaytoType
          amount={<Amount value={amount} />}
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
    );
  }

  return (
    <Fragment>
      <section>
        <Title>
          <i18n.Translate>Exchange is ready for withdrawal</i18n.Translate>
        </Title>
        <p>
          <i18n.Translate>
            To complete the process you need to wire{` `}
            <b>{<Amount value={amount} />}</b> to the exchange bank account
          </i18n.Translate>
        </p>
      </section>
      <TransferDetails />
      <section>
        <p>
          <i18n.Translate>
            Alternative, you can also scan this QR code or open{" "}
            <a href={stringifyPaytoUri(paytoURI)}>this link</a> if you have a
            banking app installed that supports RFC 8905
          </i18n.Translate>
        </p>
        <QR text={stringifyPaytoUri(paytoURI)} />
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
