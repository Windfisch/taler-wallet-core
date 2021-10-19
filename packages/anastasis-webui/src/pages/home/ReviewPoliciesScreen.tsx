/* eslint-disable @typescript-eslint/camelcase */
import { h, VNode } from "preact";
import { BackupReducerProps, AnastasisClientFrame } from "./index";

export function ReviewPoliciesScreen(props: BackupReducerProps): VNode {
  const { reducer, backupState } = props;
  const authMethods = backupState.authentication_methods!;
  return (
    <AnastasisClientFrame title="Backup: Review Recovery Policies">
      {backupState.policies?.map((p, i) => {
        const policyName = p.methods
          .map((x, i) => authMethods[x.authentication_method].type)
          .join(" + ");
        return (
          <div key={i}>
          {/* <div key={i} class={style.policy}> */}
            <h3>
              Policy #{i + 1}: {policyName}
            </h3>
            Required Authentications:
            <ul>
              {p.methods.map((x, i) => {
                const m = authMethods[x.authentication_method];
                return (
                  <li key={i}>
                    {m.type} ({m.instructions}) at provider {x.provider}
                  </li>
                );
              })}
            </ul>
            <div>
              <button
                onClick={() => reducer.transition("delete_policy", { policy_index: i })}
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
