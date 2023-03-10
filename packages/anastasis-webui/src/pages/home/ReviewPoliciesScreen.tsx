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
import { h, VNode } from "preact";
import { useState } from "preact/hooks";
import { useAnastasisContext } from "../../context/anastasis.js";
import { authMethods, KnownAuthMethods } from "./authMethod/index.js";
import { EditPoliciesScreen } from "./EditPoliciesScreen.js";
import { AnastasisClientFrame } from "./index.js";

export function ReviewPoliciesScreen(): VNode {
  const [editingPolicy, setEditingPolicy] = useState<number | undefined>();
  const reducer = useAnastasisContext();
  if (!reducer) {
    return <div>no reducer in context</div>;
  }
  if (reducer.currentReducerState?.reducer_type !== "backup") {
    return <div>invalid state</div>;
  }

  const configuredAuthMethods =
    reducer.currentReducerState.authentication_methods ?? [];
  const policies = reducer.currentReducerState.policies ?? [];

  const providers = reducer.currentReducerState.authentication_providers ?? {};

  if (editingPolicy !== undefined) {
    return (
      <EditPoliciesScreen
        index={editingPolicy}
        cancel={() => setEditingPolicy(undefined)}
        confirm={async (newMethods) => {
          await reducer.transition("update_policy", {
            policy_index: editingPolicy,
            policy: newMethods,
          });
          setEditingPolicy(undefined);
        }}
      />
    );
  }

  const errors = policies.length < 1 ? "Need more policies" : undefined;
  return (
    <AnastasisClientFrame
      hideNext={errors}
      title="Backup: Review Recovery Policies"
    >
      {policies.length > 0 && (
        <p class="block">
          Based on your configured authentication method you have created, some
          policies have been configured. In order to recover your secret you
          have to solve all the challenges of at least one policy.
        </p>
      )}
      {policies.length < 1 && (
        <p class="block">
          No policies had been created. Go back and add more authentication
          methods.
        </p>
      )}
      <div class="block">
        <button
          class="button is-success"
          style={{ marginLeft: 10 }}
          onClick={() => setEditingPolicy(policies.length)}
        >
          Add new policy
        </button>
      </div>
      {policies.map((p, policy_index) => {
        const methods = p.methods
          .map(
            (x) =>
              configuredAuthMethods[x.authentication_method] && {
                ...configuredAuthMethods[x.authentication_method],
                provider: x.provider,
              },
          )
          .filter((x) => !!x);

        const policyName = methods.map((x) => x.type).join(" + ");

        if (p.methods.length > methods.length) {
          //there is at least one authentication method that is corrupted
          return null;
        }

        return (
          <div
            key={policy_index}
            class="box"
            style={{ display: "flex", justifyContent: "space-between" }}
          >
            <div>
              <h3 class="subtitle">
                Policy #{policy_index + 1}: {policyName}
              </h3>
              {!methods.length && <p>No auth method found</p>}
              {methods.map((m, i) => {
                const p = providers[
                  m.provider
                ] as AuthenticationProviderStatusOk;
                return (
                  <p
                    key={i}
                    class="block"
                    style={{ display: "flex", alignItems: "center" }}
                  >
                    <span class="icon">
                      {authMethods[m.type as KnownAuthMethods]?.icon}
                    </span>
                    <span>
                      {m.instructions} recovery provided by{" "}
                      <a href={m.provider} target="_blank" rel="noreferrer">
                        {p.business_name}
                      </a>
                    </span>
                  </p>
                );
              })}
            </div>
            <div
              style={{
                marginTop: "auto",
                marginBottom: "auto",
                display: "flex",
                justifyContent: "space-between",
                flexDirection: "column",
              }}
            >
              <button
                class="button is-info block"
                onClick={() => setEditingPolicy(policy_index)}
              >
                Edit
              </button>
              <button
                class="button is-danger block"
                onClick={() =>
                  reducer.transition("delete_policy", { policy_index })
                }
              >
                Delete
              </button>
            </div>
          </div>
        );
      })}
    </AnastasisClientFrame>
  );
}
