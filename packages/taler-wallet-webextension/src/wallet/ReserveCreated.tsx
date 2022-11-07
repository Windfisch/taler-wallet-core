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
import { AmountJson, PaytoUri, stringifyPaytoUri } from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";
import { Amount } from "../components/Amount.js";
import { BankDetailsByPaytoType } from "../components/BankDetailsByPaytoType.js";
import { CopyButton } from "../components/CopyButton.js";
import { ErrorMessage } from "../components/ErrorMessage.js";
import { QR } from "../components/QR.js";
import { Title, WarningBox } from "../components/styled/index.js";
import { useTranslationContext } from "../context/translation.js";
import { Button } from "../mui/Button.js";
export interface Props {
  reservePub: string;
  paytoURI: PaytoUri | undefined;
  exchangeBaseUrl: string;
  amount: AmountJson;
  onCancel: () => Promise<void>;
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
    return (
      <section>
        <BankDetailsByPaytoType
          amount={amount}
          exchangeBaseUrl={exchangeBaseUrl}
          payto={paytoURI}
          subject={reservePub}
        />
        <table>
          <tbody>
            <tr>
              <td>
                <pre>
                  <b>
                    <a
                      target="_bank"
                      rel="noreferrer"
                      title="RFC 8905 for designating targets for payments"
                      href="https://tools.ietf.org/html/rfc8905"
                    >
                      Payto URI
                    </a>
                  </b>
                </pre>
              </td>
              <td width="100%">{stringifyPaytoUri(paytoURI)}</td>
              <td>
                <CopyButton getContent={() => stringifyPaytoUri(paytoURI)} />
              </td>
            </tr>
          </tbody>
        </table>
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
        <Button variant="contained" color="error" onClick={onCancel}>
          <i18n.Translate>Cancel withdrawal</i18n.Translate>
        </Button>
      </footer>
    </Fragment>
  );
}
