import { h, VNode } from "preact";
import { BackupReducerProps, AnastasisClientFrame } from "./index";

export function PoliciesPayingScreen(props: BackupReducerProps): VNode {
  const payments = props.backupState.policy_payment_requests ?? [];

  return (
    <AnastasisClientFrame hideNext title="Backup: Recovery Document Payments">
      <p>
        Some of the providers require a payment to store the encrypted
        recovery document.
      </p>
      <ul>
        {payments.map((x, i) => {
          return (
            <li key={i}>
              {x.provider}: {x.payto}
            </li>
          );
        })}
      </ul>
      <button onClick={() => props.reducer.transition("pay", {})}>
        Check payment status now
      </button>
    </AnastasisClientFrame>
  );
}
