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

import { PaytoUri, stringifyPaytoUri } from "@gnu-taler/taler-util";
import { styled } from "@linaria/react";
import { Fragment, h, VNode } from "preact";
import { useState } from "preact/hooks";
import {
  ExtraLargeText,
  LargeText,
  SmallBoldText,
  SmallLightText,
} from "./styled/index.js";

export type Kind = "positive" | "negative" | "neutral";
interface Props {
  title: VNode | string;
  text: VNode | string;
  kind?: Kind;
  big?: boolean;
  showSign?: boolean;
}
export function Part({
  text,
  title,
  kind = "neutral",
  big,
  showSign,
}: Props): VNode {
  const Text = big ? ExtraLargeText : LargeText;
  return (
    <div style={{ margin: "1em" }}>
      <SmallBoldText style={{ marginBottom: "1em" }}>{title}</SmallBoldText>
      <Text
        style={{
          color:
            kind == "positive" ? "green" : kind == "negative" ? "red" : "black",
          fontWeight: "lighten",
        }}
      >
        {!showSign || kind === "neutral"
          ? undefined
          : kind === "positive"
          ? "+"
          : "-"}
        {text}
      </Text>
    </div>
  );
}

const CollasibleBox = styled.div`
  border: 1px solid black;
  border-radius: 0.25em;
  display: flex;
  vertical-align: middle;
  justify-content: space-between;
  flex-direction: column;
  /* margin: 0.5em; */
  padding: 0.5em;
  /* margin: 1em; */
  /* width: 100%; */
  /* color: #721c24; */
  /* background: #f8d7da; */

  & > div {
    display: flex;
    justify-content: space-between;
    div {
      margin-top: auto;
      margin-bottom: auto;
    }
    & > button {
      align-self: center;
      font-size: 100%;
      padding: 0;
      height: 28px;
      width: 28px;
    }
  }
`;
import arrowDown from "../svg/chevron-down.svg";
import { useTranslationContext } from "../context/translation.js";

export function PartCollapsible({ text, title, big, showSign }: Props): VNode {
  const Text = big ? ExtraLargeText : LargeText;
  const [collapsed, setCollapsed] = useState(true);

  return (
    <CollasibleBox>
      <div>
        <SmallBoldText>{title}</SmallBoldText>
        <button
          onClick={() => {
            setCollapsed((v) => !v);
          }}
        >
          <div
            style={{
              transform: !collapsed ? "scaleY(-1)" : undefined,
              height: 24,
            }}
            dangerouslySetInnerHTML={{ __html: arrowDown }}
          />
        </button>
      </div>
      {/* <SmallBoldText
        style={{
          paddingBottom: "1em",
          paddingTop: "1em",
          paddingLeft: "1em",
          border: "black solid 1px",
        }}
      >
        
      </SmallBoldText> */}
      {!collapsed && <div style={{ display: "block" }}>{text}</div>}
    </CollasibleBox>
  );
}

interface PropsPayto {
  payto: PaytoUri;
  kind: Kind;
  big?: boolean;
}
export function PartPayto({ payto, kind, big }: PropsPayto): VNode {
  const Text = big ? ExtraLargeText : LargeText;
  let text: VNode | undefined = undefined;
  let title = "";
  const { i18n } = useTranslationContext();
  if (payto.isKnown) {
    if (payto.targetType === "x-taler-bank") {
      text = <Fragment>{payto.account}</Fragment>;
      title = i18n.str`Bank account`;
    } else if (payto.targetType === "bitcoin") {
      text =
        payto.segwitAddrs && payto.segwitAddrs.length > 0 ? (
          <ul>
            <li>{payto.targetPath}</li>
            <li>{payto.segwitAddrs[0]}</li>
            <li>{payto.segwitAddrs[1]}</li>
          </ul>
        ) : (
          <Fragment>{payto.targetPath}</Fragment>
        );
      title = i18n.str`Bitcoin address`;
    } else if (payto.targetType === "iban") {
      text = <Fragment>{payto.targetPath}</Fragment>;
      title = i18n.str`IBAN`;
    }
  }
  if (!text) {
    text = <Fragment>{stringifyPaytoUri(payto)}</Fragment>;
    title = "Payto URI";
  }
  return (
    <div style={{ margin: "1em" }}>
      <SmallBoldText>{title}</SmallBoldText>
      <Text
        style={{
          color:
            kind == "positive" ? "green" : kind == "negative" ? "red" : "black",
        }}
      >
        {text}
      </Text>
    </div>
  );
}
