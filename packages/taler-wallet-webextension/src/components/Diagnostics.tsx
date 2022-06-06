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

import { WalletDiagnostics } from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";
import { useTranslationContext } from "../context/translation.js";

interface Props {
  timedOut: boolean;
  diagnostics: WalletDiagnostics | undefined;
}

export function Diagnostics({ timedOut, diagnostics }: Props): VNode {
  const { i18n } = useTranslationContext();
  if (timedOut) {
    return (
      <p>
        <i18n.Translate>
          Diagnostics timed out. Could not talk to the wallet backend.
        </i18n.Translate>
      </p>
    );
  }

  if (diagnostics) {
    if (diagnostics.errors.length === 0) {
      return <Fragment />;
    }
    return (
      <div
        style={{
          borderLeft: "0.5em solid red",
          paddingLeft: "1em",
          paddingTop: "0.2em",
          paddingBottom: "0.2em",
        }}
      >
        <p>
          <i18n.Translate>Problems detected:</i18n.Translate>
        </p>
        <ol>
          {diagnostics.errors.map((errMsg) => (
            <li key={errMsg}>{errMsg}</li>
          ))}
        </ol>
        {diagnostics.firefoxIdbProblem ? (
          <p>
            <i18n.Translate>
              Please check in your <code>about:config</code> settings that you
              have IndexedDB enabled (check the preference name{" "}
              <code>dom.indexedDB.enabled</code>).
            </i18n.Translate>
          </p>
        ) : null}
        {diagnostics.dbOutdated ? (
          <p>
            <i18n.Translate>
              Your wallet database is outdated. Currently automatic migration is
              not supported. Please go <i18n.Translate>here</i18n.Translate>
              to reset the wallet database.
            </i18n.Translate>
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <p>
      <i18n.Translate>Running diagnostics</i18n.Translate> ...
    </p>
  );
}
