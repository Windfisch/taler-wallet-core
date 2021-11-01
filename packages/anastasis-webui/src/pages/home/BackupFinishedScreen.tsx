import { format } from "date-fns";
import { h, VNode } from "preact";
import { useAnastasisContext } from "../../context/anastasis";
import { AnastasisClientFrame } from "./index";

export function BackupFinishedScreen(): VNode {
  const reducer = useAnastasisContext()
  if (!reducer) {
    return <div>no reducer in context</div>
  }
  if (!reducer.currentReducerState || reducer.currentReducerState.backup_state === undefined) {
    return <div>invalid state</div>
  }
  const details = reducer.currentReducerState.success_details

  return (<AnastasisClientFrame hideNav title="Backup finished">
    {reducer.currentReducerState.secret_name ? <p>
      Your backup of secret <b>"{reducer.currentReducerState.secret_name}"</b> was
      successful.
    </p> :
      <p>
        Your secret was successfully backed up.
      </p>}

    {details && <div class="block">
    <p>The backup is stored by the following providers:</p>
      {Object.keys(details).map((x, i) => {
        const sd = details[x];
        return (
          <div key={i} class="box">
            {x}
            <p>
              version {sd.policy_version}
              {sd.policy_expiration.t_ms !== 'never' ? ` expires at: ${format(sd.policy_expiration.t_ms, 'dd/MM/yyyy')}` : ' without expiration date'}
            </p>
          </div>
        );
      })}
    </div>}
  </AnastasisClientFrame>);
}
