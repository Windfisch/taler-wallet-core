import { h, VNode } from "preact";
import { BackupReducerProps, AnastasisClientFrame } from "./index";

export function BackupFinishedScreen(props: BackupReducerProps): VNode {
  return (<AnastasisClientFrame hideNext title="Backup finished">
    <p>
      Your backup of secret "{props.backupState.secret_name ?? "??"}" was
      successful.
    </p>
    <p>The backup is stored by the following providers:</p>
    <ul>
      {Object.keys(props.backupState.success_details!).map((x, i) => {
        const sd = props.backupState.success_details![x];
        return (
          <li key={i}>
            {x} (Policy version {sd.policy_version})
          </li>
        );
      })}
    </ul>
    <button onClick={() => props.reducer.reset()}>Back to start</button>
  </AnastasisClientFrame>);
}
