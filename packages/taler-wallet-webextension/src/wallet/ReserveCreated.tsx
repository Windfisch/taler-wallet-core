import {
  AmountJson,
  Amounts,
  parsePaytoUri,
  PaytoUri,
} from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";
import { useEffect, useState } from "preact/hooks";
import { QR } from "../components/QR";
import {
  ButtonDestructive,
  ButtonPrimary,
  WalletBox,
  WarningBox,
} from "../components/styled";
export interface Props {
  reservePub: string;
  payto: string;
  exchangeBaseUrl: string;
  amount: AmountJson;
  onBack: () => void;
}

interface BankDetailsProps {
  payto: PaytoUri;
  exchangeBaseUrl: string;
  subject: string;
  amount: string;
}

function Row({
  name,
  value,
  literal,
}: {
  name: string;
  value: string;
  literal?: boolean;
}): VNode {
  const [copied, setCopied] = useState(false);
  function copyText(): void {
    navigator.clipboard.writeText(value);
    setCopied(true);
  }
  useEffect(() => {
    setTimeout(() => {
      setCopied(false);
    }, 1000);
  }, [copied]);
  return (
    <tr>
      <td>
        {!copied ? (
          <ButtonPrimary small onClick={copyText}>
            &nbsp; Copy &nbsp;
          </ButtonPrimary>
        ) : (
          <ButtonPrimary small disabled>
            Copied
          </ButtonPrimary>
        )}
      </td>
      <td>
        <b>{name}</b>
      </td>
      {literal ? (
        <td>
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {value}
          </pre>
        </td>
      ) : (
        <td>{value}</td>
      )}
    </tr>
  );
}

function BankDetailsByPaytoType({
  payto,
  subject,
  exchangeBaseUrl,
  amount,
}: BankDetailsProps): VNode {
  const firstPart = !payto.isKnown ? (
    <Fragment>
      <Row name="Account" value={payto.targetPath} />
      <Row name="Exchange" value={exchangeBaseUrl} />
    </Fragment>
  ) : payto.targetType === "x-taler-bank" ? (
    <Fragment>
      <Row name="Bank host" value={payto.host} />
      <Row name="Bank account" value={payto.account} />
      <Row name="Exchange" value={exchangeBaseUrl} />
    </Fragment>
  ) : payto.targetType === "iban" ? (
    <Fragment>
      <Row name="IBAN" value={payto.iban} />
      <Row name="Exchange" value={exchangeBaseUrl} />
    </Fragment>
  ) : undefined;
  return (
    <table>
      {firstPart}
      <Row name="Amount" value={amount} />
      <Row name="Subject" value={subject} literal />
    </table>
  );
}
export function ReserveCreated({
  reservePub,
  payto,
  onBack,
  exchangeBaseUrl,
  amount,
}: Props): VNode {
  const paytoURI = parsePaytoUri(payto);
  // const url = new URL(paytoURI?.targetPath);
  if (!paytoURI) {
    return <div>could not parse payto uri from exchange {payto}</div>;
  }
  return (
    <WalletBox>
      <section>
        <h1>Bank transfer details</h1>
        <p>
          Please wire <b>{Amounts.stringify(amount)}</b> to:
        </p>
        <BankDetailsByPaytoType
          amount={Amounts.stringify(amount)}
          exchangeBaseUrl={exchangeBaseUrl}
          payto={paytoURI}
          subject={reservePub}
        />
      </section>
      <section>
        <p>
          <WarningBox>
            Make sure to use the correct subject, otherwise the money will not
            arrive in this wallet.
          </WarningBox>
        </p>
        <p>
          Alternative, you can also scan this QR code or open{" "}
          <a href={payto}>this link</a> if you have a banking app installed that
          supports RFC 8905
        </p>
        <QR text={payto} />
      </section>
      <footer>
        <div />
        <ButtonDestructive onClick={onBack}>Cancel withdraw</ButtonDestructive>
      </footer>
    </WalletBox>
  );
}
