/* eslint-disable @typescript-eslint/camelcase */
import { h, VNode } from "preact";
import { useAnastasisContext } from "../../context/anastasis";
import { AnastasisClientFrame } from "./index";

export function ReviewPoliciesScreen(): VNode {
  const reducer = useAnastasisContext()
  if (!reducer) {
    return <div>no reducer in context</div>
  }
  if (!reducer.currentReducerState || reducer.currentReducerState.backup_state === undefined) {
    return <div>invalid state</div>
  }
  const authMethods = reducer.currentReducerState.authentication_methods ?? [];
  const policies = reducer.currentReducerState.policies ?? [];

  return (
    <AnastasisClientFrame title="Backup: Review Recovery Policies">
      {policies.map((p, policy_index) => {
        const methods = p.methods
          .map(x => authMethods[x.authentication_method] && ({ ...authMethods[x.authentication_method], provider: x.provider }))
          .filter(x => !!x)

        const policyName = methods.map(x => x.type).join(" + ");

        return (
          <div key={policy_index} class="policy">
            <h3>
              Policy #{policy_index + 1}: {policyName}
            </h3>
            Required Authentications:
            {!methods.length && <p>
              No auth method found
            </p>}
            <ul>
              {methods.map((m, i) => {
                return (
                  <li key={i}>
                    {m.type} ({m.instructions}) at provider {m.provider}
                  </li>
                );
              })}
            </ul>
            <div>
              <button
                onClick={() => reducer.transition("delete_policy", { policy_index })}
              >
                Delete Policy
              </button>
            </div>
          </div>
        );
      })}
    </AnastasisClientFrame>
  );
}
