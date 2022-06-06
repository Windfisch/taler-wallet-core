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
import { AuthenticationProviderStatusOk } from "@gnu-taler/anastasis-core";
import { format } from "date-fns";
import { h, VNode } from "preact";
import { useAnastasisContext } from "../../context/anastasis.js";
import { AnastasisClientFrame } from "./index.js";

export function BackupFinishedScreen(): VNode {
  const reducer = useAnastasisContext();
  if (!reducer) {
    return <div>no reducer in context</div>;
  }
  if (reducer.currentReducerState?.reducer_type !== "backup") {
    return <div>invalid state</div>;
  }
  const details = reducer.currentReducerState.success_details;
  const providers = reducer.currentReducerState.authentication_providers ?? {};

  return (
    <AnastasisClientFrame hideNav title="Backup success!">
      <p>Your backup is complete.</p>

      {details && (
        <div class="block">
          <p>The backup is stored by the following providers:</p>
          {Object.keys(details).map((url, i) => {
            const sd = details[url];
            const p = providers[url] as AuthenticationProviderStatusOk;
            return (
              <div key={i} class="box">
                <a href={url} target="_blank" rel="noreferrer">
                  {p.business_name}
                </a>
                <p>
                  version {sd.policy_version}
                  {sd.policy_expiration.t_s !== "never"
                    ? ` expires at: ${format(
                        new Date(sd.policy_expiration.t_s),
                        "dd-MM-yyyy",
                      )}`
                    : " without expiration date"}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </AnastasisClientFrame>
  );
}
