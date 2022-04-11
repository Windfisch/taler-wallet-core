/*
 This file is part of GNU Taler
 (C) 2019 Taler Systems SA

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import { PaytoUri } from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { useTranslationContext } from "../context/translation.js";
import { CopiedIcon, CopyIcon } from "../svg/index.js";
import { ButtonBox, TooltipRight } from "./styled/index.js";

export interface BankDetailsProps {
  payto: PaytoUri | undefined;
  exchangeBaseUrl: string;
  subject: string;
  amount: string | VNode;
}

export function BankDetailsByPaytoType({
  payto,
  subject,
  exchangeBaseUrl,
  amount,
}: BankDetailsProps): VNode {
  const { i18n } = useTranslationContext();

  const firstPart = !payto ? undefined : !payto.isKnown ? (
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
  return (
    <div style={{ textAlign: "left" }}>
      <p>Bank transfer details</p>
      <table>
        {firstPart}
        <Row
          name={<i18n.Translate>Exchange</i18n.Translate>}
          value={exchangeBaseUrl}
        />
        <Row
          name={<i18n.Translate>Chosen amount</i18n.Translate>}
          value={amount}
        />
        <Row
          name={<i18n.Translate>Subject</i18n.Translate>}
          value={subject}
          literal
        />
      </table>
    </div>
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
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);
  const tdRef = useRef<HTMLTableCellElement>(null);
  function copyText(): void {
    const content = literal
      ? preRef.current?.textContent
      : tdRef.current?.textContent;
    navigator.clipboard.writeText(content || "");
    setCopied(true);
  }
  useEffect(() => {
    if (copied) {
      setTimeout(() => {
        setCopied(false);
      }, 1000);
    }
  }, [copied, preRef]);
  return (
    <tr>
      <td>
        {!copied ? (
          <ButtonBox onClick={copyText}>
            <CopyIcon />
          </ButtonBox>
        ) : (
          <TooltipRight content="Copied">
            <ButtonBox disabled>
              <CopiedIcon />
            </ButtonBox>
          </TooltipRight>
        )}
      </td>
      <td>
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
    </tr>
  );
}
