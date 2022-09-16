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

import {
  AmountJson,
  Amounts,
  PaytoUri,
  segwitMinAmount,
} from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { useTranslationContext } from "../context/translation.js";
import { CopiedIcon, CopyIcon } from "../svg/index.js";
import { Amount } from "./Amount.js";
import { ButtonBox, TooltipLeft, TooltipRight } from "./styled/index.js";

export interface BankDetailsProps {
  payto: PaytoUri | undefined;
  exchangeBaseUrl: string;
  subject: string;
  amount: AmountJson;
}

export function BankDetailsByPaytoType({
  payto,
  subject,
  exchangeBaseUrl,
  amount,
}: BankDetailsProps): VNode {
  const { i18n } = useTranslationContext();
  if (!payto) return <Fragment />;

  if (payto.isKnown && payto.targetType === "bitcoin") {
    const min = segwitMinAmount(amount.currency);
    return (
      <section
        style={{
          textAlign: "left",
          border: "solid 1px black",
          padding: 8,
          borderRadius: 4,
        }}
      >
        <p style={{ marginTop: 0 }}>
          <i18n.Translate>Bitcoin transfer details</i18n.Translate>
        </p>
        <p>
          <i18n.Translate>
            The exchange need a transaction with 3 output, one output is the
            exchange account and the other two are segwit fake address for
            metadata with an minimum amount.
          </i18n.Translate>
        </p>

        <p>
          <i18n.Translate>
            In bitcoincore wallet use &apos;Add Recipient&apos; button to add
            two additional recipient and copy addresses and amounts
          </i18n.Translate>
        </p>
        <table>
          <tr>
            <td>
              <div>
                {payto.targetPath} <Amount value={amount} hideCurrency /> BTC
              </div>
              {payto.segwitAddrs.map((addr, i) => (
                <div key={i}>
                  {addr} <Amount value={min} hideCurrency /> BTC
                </div>
              ))}
            </td>
            <td></td>
            <td>
              <CopyButton
                getContent={() =>
                  `${payto.targetPath} ${Amounts.stringifyValue(amount)} BTC`
                }
              />
            </td>
          </tr>
        </table>
        <p>
          <i18n.Translate>
            Make sure the amount show{" "}
            {Amounts.stringifyValue(Amounts.sum([amount, min, min]).amount)}{" "}
            BTC, else you have to change the base unit to BTC
          </i18n.Translate>
        </p>
      </section>
    );
  }

  const accountPart = !payto.isKnown ? (
    <Row
      name={<i18n.Translate>Account</i18n.Translate>}
      value={payto.targetPath}
    />
  ) : payto.targetType === "x-taler-bank" ? (
    <Fragment>
      <Row
        name={<i18n.Translate>Bank host</i18n.Translate>}
        value={payto.host}
      />
      <Row
        name={<i18n.Translate>Bank account</i18n.Translate>}
        value={payto.account}
      />
    </Fragment>
  ) : payto.targetType === "iban" ? (
    <Row name={<i18n.Translate>IBAN</i18n.Translate>} value={payto.iban} />
  ) : undefined;

  const receiver = payto.params["receiver"] || undefined;
  return (
    <div
      style={{
        textAlign: "left",
        border: "solid 1px black",
        padding: 8,
        borderRadius: 4,
      }}
    >
      <p style={{ marginTop: 0 }}>
        <i18n.Translate>Bank transfer details</i18n.Translate>
      </p>
      <table>
        {accountPart}
        <Row
          name={<i18n.Translate>Amount</i18n.Translate>}
          value={<Amount value={amount} />}
        />
        <Row
          name={<i18n.Translate>Subject</i18n.Translate>}
          value={subject}
          literal
        />
        {receiver ? (
          <Row
            name={<i18n.Translate>Receiver name</i18n.Translate>}
            value={receiver}
          />
        ) : undefined}
      </table>
    </div>
  );
}

function CopyButton({ getContent }: { getContent: () => string }): VNode {
  const [copied, setCopied] = useState(false);
  function copyText(): void {
    navigator.clipboard.writeText(getContent() || "");
    setCopied(true);
  }
  useEffect(() => {
    if (copied) {
      setTimeout(() => {
        setCopied(false);
      }, 1000);
    }
  }, [copied]);

  if (!copied) {
    return (
      <ButtonBox onClick={copyText}>
        <CopyIcon />
      </ButtonBox>
    );
  }
  return (
    <TooltipLeft content="Copied">
      <ButtonBox disabled>
        <CopiedIcon />
      </ButtonBox>
    </TooltipLeft>
  );
}

function Row({
  name,
  value,
  literal,
}: {
  name: VNode;
  value: string | VNode;
  literal?: boolean;
}): VNode {
  const preRef = useRef<HTMLPreElement>(null);
  const tdRef = useRef<HTMLTableCellElement>(null);

  function getContent(): string {
    return preRef.current?.textContent || tdRef.current?.textContent || "";
  }

  return (
    <tr>
      <td style={{ paddingRight: 8 }}>
        <b>{name}</b>
      </td>
      {literal ? (
        <td>
          <pre
            ref={preRef}
            style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
          >
            {value}
          </pre>
        </td>
      ) : (
        <td ref={tdRef}>{value}</td>
      )}
      <td>
        <CopyButton getContent={getContent} />
      </td>
    </tr>
  );
}
