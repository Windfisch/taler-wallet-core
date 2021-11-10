import { bytesToString, decodeCrock } from "@gnu-taler/taler-util";
import { h, VNode } from "preact";
import { useAnastasisContext } from "../../context/anastasis";
import { AnastasisClientFrame } from "./index";

export function RecoveryFinishedScreen(): VNode {
  const reducer = useAnastasisContext();

  if (!reducer) {
    return <div>no reducer in context</div>;
  }
  if (
    !reducer.currentReducerState ||
    reducer.currentReducerState.recovery_state === undefined
  ) {
    return <div>invalid state</div>;
  }
  const encodedSecret = reducer.currentReducerState.core_secret;
  if (!encodedSecret) {
    return (
      <AnastasisClientFrame title="Recovery Problem" hideNav>
        <p>Secret not found</p>
        <div
          style={{
            marginTop: "2em",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <button class="button" onClick={() => reducer.back()}>
            Back
          </button>
        </div>
      </AnastasisClientFrame>
    );
  }
  const secret = bytesToString(decodeCrock(encodedSecret.value));
  return (
    <AnastasisClientFrame title="Recovery Finished" hideNav>
      <p>Your secret: {secret}</p>
      <div
        style={{
          marginTop: "2em",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <button class="button" onClick={() => reducer.back()}>
          Back
        </button>
      </div>
    </AnastasisClientFrame>
  );
}
