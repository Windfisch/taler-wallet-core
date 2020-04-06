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

/**
 * Welcome page, shown on first installs.
 *
 * @author Florian Dold
 */

import React, { useState, useEffect } from "react";
import { getDiagnostics } from "../wxApi";
import { PageLink } from "../renderHtml";
import { WalletDiagnostics } from "../../types/walletTypes";

function Diagnostics() {
  const [timedOut, setTimedOut] = useState(false);
  const [diagnostics, setDiagnostics] = useState<WalletDiagnostics | undefined>(
    undefined,
  );

  useEffect(() => {
    let gotDiagnostics = false;
    setTimeout(() => {
      if (!gotDiagnostics) {
        console.error("timed out");
        setTimedOut(true);
      }
    }, 1000);
    const doFetch = async () => {
      const d = await getDiagnostics();
      console.log("got diagnostics", d);
      gotDiagnostics = true;
      setDiagnostics(d);
    };
    console.log("fetching diagnostics");
    doFetch();
  }, []);

  if (timedOut) {
    return <p>Diagnostics timed out. Could not talk to the wallet backend.</p>;
  }

  if (diagnostics) {
    if (diagnostics.errors.length === 0) {
      return <p>Running diagnostics ... everything looks fine.</p>;
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
              <li>{errMsg}</li>
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
              <PageLink pageName="reset-required.html">here</PageLink> to reset
              the wallet database.
            </p>
          ) : null}
        </div>
      );
    }
  }

  return <p>Running diagnostics ...</p>;
}

function Welcome() {
  return (
    <>
      <p>Thank you for installing the wallet.</p>
      <h2>First Steps</h2>
      <p>
        Check out <a href="https://demo.taler.net/">demo.taler.net</a> for a
        demo.
      </p>
      <h2>Troubleshooting</h2>
      <Diagnostics />
    </>
  );
}

export function createWelcomePage() {
  return <Welcome />;
}