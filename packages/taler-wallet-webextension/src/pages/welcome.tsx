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

import { useState, useEffect, useMemo, useCallback } from "preact/hooks";
import { getDiagnostics } from "../wxApi";
import { PageLink } from "../renderHtml";
import * as wxApi from "../wxApi";
import { getPermissionsApi } from "../compat";
import { extendedPermissions } from "../permissions";
import { WalletDiagnostics } from "@gnu-taler/taler-util";
import { Fragment, JSX } from "preact/jsx-runtime";

function Diagnostics(): JSX.Element | null {
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
    const doFetch = async (): Promise<void> => {
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


async function handleExtendedPerm(isEnabled: boolean): Promise<boolean> {
  let nextVal: boolean | undefined;

  if (!isEnabled) {
    const granted = await new Promise<boolean>((resolve, reject) => {
      // We set permissions here, since apparently FF wants this to be done
      // as the result of an input event ...
      getPermissionsApi().request(extendedPermissions, (granted: boolean) => {
        if (chrome.runtime.lastError) {
          console.error("error requesting permissions");
          console.error(chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }
        console.log("permissions granted:", granted);
        resolve(granted);
      });
    });
    const res = await wxApi.setExtendedPermissions(granted);
    nextVal = res.newValue;
  } else {
    const res = await wxApi.setExtendedPermissions(false);
    nextVal = res.newValue;
  }
  console.log("new permissions applied:", nextVal ?? false);
  return nextVal ?? false
}

export function PermissionsCheckbox(): JSX.Element {
  const [extendedPermissionsEnabled, setExtendedPermissionsEnabled] = useState(false);

  const togglePermission = () => {
    setExtendedPermissionsEnabled(v => !v)
    handleExtendedPerm(extendedPermissionsEnabled).then( result => {
      setExtendedPermissionsEnabled(result)
    } )
  }

  useEffect(() => {
    async function getExtendedPermValue(): Promise<void> {
      const res = await wxApi.getExtendedPermissions();
      setExtendedPermissionsEnabled(res.newValue);
    }
    getExtendedPermValue();
  },[]);

  return (
    <div>
      <input
        checked={extendedPermissionsEnabled}
        onClick={togglePermission}
        type="checkbox"
        id="checkbox-perm"
        style={{ width: "1.5em", height: "1.5em", verticalAlign: "middle" }}
      />
      <label
        htmlFor="checkbox-perm"
        style={{ marginLeft: "0.5em", fontWeight: "bold" }}
      >
        Automatically open wallet based on page content
      </label>
      <span
        style={{
          color: "#383838",
          fontSize: "smaller",
          display: "block",
          marginLeft: "2em",
        }}
      >
        (Enabling this option below will make using the wallet faster, but
        requires more permissions from your browser.)
      </span>
    </div>
  );
}

export function Welcome(): JSX.Element {
  return (
    <>
      <p>Thank you for installing the wallet.</p>
      <Diagnostics />
      <h2>Permissions</h2>
      <PermissionsCheckbox />
      <h2>Next Steps</h2>
      <a href="https://demo.taler.net/" style={{ display: "block" }}>
        Try the demo »
      </a>
      <a href="https://demo.taler.net/" style={{ display: "block" }}>
        Learn how to top up your wallet balance »
      </a>
    </>
  );
}

/**
 * @deprecated to be removed
 */
export function createWelcomePage(): JSX.Element {
  return <Welcome />;
}
