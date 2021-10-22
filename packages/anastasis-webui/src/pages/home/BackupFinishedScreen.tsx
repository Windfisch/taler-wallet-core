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
  return (<AnastasisClientFrame hideNext title="Backup finished">
    <p>
      Your backup of secret "{reducer.currentReducerState.secret_name ?? "??"}" was
      successful.
    </p>
    <p>The backup is stored by the following providers:</p>

    {details && <ul>
      {Object.keys(details).map((x, i) => {
        const sd = details[x];
        return (
          <li key={i}>
            {x} (Policy version {sd.policy_version})
          </li>
        );
      })}
    </ul>}
    <button onClick={() => reducer.reset()}>Back to start</button>
  </AnastasisClientFrame>);
}
