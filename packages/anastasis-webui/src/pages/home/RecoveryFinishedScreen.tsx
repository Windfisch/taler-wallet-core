import {
  bytesToString,
  decodeCrock
} from "@gnu-taler/taler-util";
import { h, VNode } from "preact";
import { useAnastasisContext } from "../../context/anastasis";
import { AnastasisClientFrame } from "./index";

export function RecoveryFinishedScreen(): VNode {
  const reducer = useAnastasisContext()

  if (!reducer) {
    return <div>no reducer in context</div>
  }
  if (!reducer.currentReducerState || reducer.currentReducerState.recovery_state === undefined) {
    return <div>invalid state</div>
  }
  const encodedSecret = reducer.currentReducerState.core_secret?.value
  if (!encodedSecret) {
    return <AnastasisClientFrame title="Recovery Problem" hideNext>
      <p>
        Secret not found
      </p>
    </AnastasisClientFrame>
  }
  const secret = bytesToString(decodeCrock(encodedSecret))
  return (
    <AnastasisClientFrame title="Recovery Finished" hideNext>
      <p>
        Secret: {secret}
      </p>
    </AnastasisClientFrame>
  );
}
