/*
 This file is part of GNU Anastasis
 (C) 2021-2022 Anastasis SARL

 GNU Anastasis is free software; you can redistribute it and/or modify it under the
 terms of the GNU Affero General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Anastasis is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License along with
 GNU Anastasis; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
import { bytesToString, decodeCrock } from "@gnu-taler/taler-util";
import { h, VNode } from "preact";
import { useEffect, useState } from "preact/hooks";
import { QR } from "../../components/QR.js";
import { useAnastasisContext } from "../../context/anastasis.js";
import { AnastasisClientFrame } from "./index.js";

export function RecoveryFinishedScreen(): VNode {
  const reducer = useAnastasisContext();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    setTimeout(() => {
      setCopied(false);
    }, 1000);
  }, [copied]);

  if (!reducer) {
    return <div>no reducer in context</div>;
  }
  if (reducer.currentReducerState?.reducer_type !== "recovery") {
    return <div>invalid state</div>;
  }
  const secretName = reducer.currentReducerState.recovery_document?.secret_name;
  const encodedSecret = reducer.currentReducerState.core_secret;
  if (!encodedSecret) {
    return (
      <AnastasisClientFrame title="Recovery Problem" hideNav>
        <p>Secret not found</p>
        <div
          style={{
            marginTop: "2em",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <button class="button" onClick={() => reducer.back()}>
            Back
          </button>
        </div>
      </AnastasisClientFrame>
    );
  }
  const secret = bytesToString(decodeCrock(encodedSecret.value));
  const plainText =
    encodedSecret.value.length < 1000 && encodedSecret.mime === "text/plain";
  const contentURI = !plainText
    ? secret
    : `data:${encodedSecret.mime},${secret}`;
  return (
    <AnastasisClientFrame title="Recovery Success" hideNav>
      <h2 class="subtitle">Your secret was recovered</h2>
      {secretName && (
        <p class="block">
          <b>Secret name:</b> {secretName}
        </p>
      )}
      <div class="block buttons" disabled={copied}>
        {plainText ? (
          <button
            class="button"
            onClick={() => {
              navigator.clipboard.writeText(secret);
              setCopied(true);
            }}
          >
            {!copied ? "Copy" : "Copied"}
          </button>
        ) : undefined}

        <a
          class="button is-info"
          download={
            encodedSecret.filename ? encodedSecret.filename : "secret.file"
          }
          href={contentURI}
        >
          <div class="icon is-small ">
            <i class="mdi mdi-download" />
          </div>
          <span>Download content</span>
        </a>
      </div>

      {plainText ? (
        <div class="block">
          <QR text={secret} />
        </div>
      ) : undefined}

      <div
        style={{
          display: "flex",
          justifyContent: "center",
        }}
      >
        <p>
          <div class="buttons ml-4">
            <button
              class="button is-primary is-right"
              onClick={() => reducer.reset()}
            >
              Start again
            </button>
          </div>
        </p>
      </div>
    </AnastasisClientFrame>
  );
}
