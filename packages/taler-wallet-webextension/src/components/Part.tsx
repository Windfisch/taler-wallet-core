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
import { PaytoUri, stringifyPaytoUri } from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";
import { ExtraLargeText, LargeText, SmallLightText } from "./styled/index.js";

export type Kind = "positive" | "negative" | "neutral";
interface Props {
  title: VNode;
  text: VNode | string;
  kind: Kind;
  big?: boolean;
}
export function Part({ text, title, kind, big }: Props): VNode {
  const Text = big ? ExtraLargeText : LargeText;
  return (
    <div style={{ margin: "1em" }}>
      <SmallLightText style={{ margin: ".5em" }}>{title}</SmallLightText>
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

interface PropsPayto {
  payto: PaytoUri;
  kind: Kind;
  big?: boolean;
}
export function PartPayto({ payto, kind, big }: PropsPayto): VNode {
  const Text = big ? ExtraLargeText : LargeText;
  let text: string | undefined = undefined;
  let title = "";
  if (payto.isKnown) {
    if (payto.targetType === "x-taler-bank") {
      text = payto.account;
      title = "Bank account";
    } else if (payto.targetType === "bitcoin") {
      text = payto.targetPath;
      title = "Bitcoin addr";
    } else if (payto.targetType === "iban") {
      text = payto.targetPath;
      title = "IBAN";
    }
  }
  if (!text) {
    text = stringifyPaytoUri(payto);
    title = "Payto URI";
  }
  return (
    <div style={{ margin: "1em" }}>
      <SmallLightText style={{ margin: ".5em" }}>{title}</SmallLightText>
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
