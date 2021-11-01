/* eslint-disable @typescript-eslint/camelcase */
import { h, VNode } from "preact";
import { useAnastasisContext } from "../../context/anastasis";
import { AnastasisClientFrame } from "./index";
import { authMethods, KnownAuthMethods } from "./authMethodSetup";

export function ReviewPoliciesScreen(): VNode {
  const reducer = useAnastasisContext()
  if (!reducer) {
    return <div>no reducer in context</div>
  }
  if (!reducer.currentReducerState || reducer.currentReducerState.backup_state === undefined) {
    return <div>invalid state</div>
  }
  const configuredAuthMethods = reducer.currentReducerState.authentication_methods ?? [];
  const policies = reducer.currentReducerState.policies ?? [];

  const errors = policies.length < 1 ? 'Need more policies' : undefined
  return (
    <AnastasisClientFrame hideNext={errors} title="Backup: Review Recovery Policies">
      {policies.length > 0 && <p class="block">
        Based on your configured authentication method you have created, some policies
        have been configured. In order to recover your secret you have to solve all the 
        challenges of at least one policy.
      </p> }
      {policies.length < 1 && <p class="block">
        No policies had been created. Go back and add more authentication methods.
      </p> }
      {policies.map((p, policy_index) => {
        const methods = p.methods
          .map(x => configuredAuthMethods[x.authentication_method] && ({ ...configuredAuthMethods[x.authentication_method], provider: x.provider }))
          .filter(x => !!x)

        const policyName = methods.map(x => x.type).join(" + ");

        return (
          <div key={policy_index} class="box" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <h3 class="subtitle">
                Policy #{policy_index + 1}: {policyName}
              </h3>
              {!methods.length && <p>
                No auth method found
              </p>}
              {methods.map((m, i) => {
                return (
                  <p key={i} class="block" style={{display:'flex', alignItems:'center'}}>
                      <span class="icon">
                        {authMethods[m.type as KnownAuthMethods]?.icon}
                      </span>
                      <span>
                        {m.instructions} recovery provided by <a href={m.provider}>{m.provider}</a>
                      </span>
                    </p>
                );
              })}
            </div>
            <div style={{ marginTop: 'auto', marginBottom: 'auto' }}><button class="button is-danger" onClick={() => reducer.transition("delete_policy", { policy_index })}>Delete</button></div>
          </div>
        );
      })}
    </AnastasisClientFrame>
  );
}
