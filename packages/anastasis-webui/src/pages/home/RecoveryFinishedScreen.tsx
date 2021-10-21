import {
  bytesToString,
  decodeCrock
} from "@gnu-taler/taler-util";
import { h, VNode } from "preact";
import { RecoveryReducerProps, AnastasisClientFrame } from "./index";

export function RecoveryFinishedScreen(props: RecoveryReducerProps): VNode {
  return (
    <AnastasisClientFrame title="Recovery Finished" hideNext>
      <p>
        Secret: {bytesToString(decodeCrock(props.recoveryState.core_secret?.value!))}
      </p>
    </AnastasisClientFrame>
  );
}
