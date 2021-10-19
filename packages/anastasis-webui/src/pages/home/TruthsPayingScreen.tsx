import { h, VNode } from "preact";
import { BackupReducerProps, AnastasisClientFrame } from "./index";

export function TruthsPayingScreen(props: BackupReducerProps): VNode {
  const payments = props.backupState.payments ?? [];
  return (
    <AnastasisClientFrame
      hideNext
      title="Backup: Authentication Storage Payments"
    >
      <p>
        Some of the providers require a payment to store the encrypted
        authentication information.
      </p>
      <ul>
        {payments.map((x, i) => {
          return <li key={i}>{x}</li>;
        })}
      </ul>
      <button onClick={() => props.reducer.transition("pay", {})}>
        Check payment status now
      </button>
    </AnastasisClientFrame>
  );
}
