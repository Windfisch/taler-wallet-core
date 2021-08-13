import { useState, useEffect } from "preact/hooks";
import { getDiagnostics } from "../wxApi";
import { PageLink } from "../renderHtml";
import { WalletDiagnostics } from "@gnu-taler/taler-util";
import { JSX } from "preact/jsx-runtime";

interface Props {
  timedOut: boolean;
  diagnostics: WalletDiagnostics | undefined
}

export function Diagnostics({timedOut, diagnostics}: Props): JSX.Element | null {

  if (timedOut) {
    return <p>Diagnostics timed out. Could not talk to the wallet backend.</p>;
  }

  if (diagnostics) {
    if (diagnostics.errors.length === 0) {
      return null;
    } else {
      return (
        <div
          style={{
            borderLeft: "0.5em solid red",
            paddingLeft: "1em",
            paddingTop: "0.2em",
            paddingBottom: "0.2em",
          }}
        >
          <p>Problems detected:</p>
          <ol>
            {diagnostics.errors.map((errMsg) => (
              <li key={errMsg}>{errMsg}</li>
            ))}
          </ol>
          {diagnostics.firefoxIdbProblem ? (
            <p>
              Please check in your <code>about:config</code> settings that you
              have IndexedDB enabled (check the preference name{" "}
              <code>dom.indexedDB.enabled</code>).
            </p>
          ) : null}
          {diagnostics.dbOutdated ? (
            <p>
              Your wallet database is outdated. Currently automatic migration is
              not supported. Please go{" "}
              <PageLink pageName="/reset-required">here</PageLink> to reset
              the wallet database.
            </p>
          ) : null}
        </div>
      );
    }
  }

  return <p>Running diagnostics ...</p>;
}
