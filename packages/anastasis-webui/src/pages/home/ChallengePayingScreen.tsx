import { h, VNode } from "preact";
import { useAnastasisContext } from "../../context/anastasis.js";
import { AnastasisClientFrame } from "./index.js";

export function ChallengePayingScreen(): VNode {
  const reducer = useAnastasisContext();
  if (!reducer) {
    return <div>no reducer in context</div>;
  }
  if (reducer.currentReducerState?.reducer_type !== "recovery") {
    return <div>invalid state</div>;
  }
  const payments = [""]; //reducer.currentReducerState.payments ??
  return (
    <AnastasisClientFrame hideNav title="Recovery: Challenge Paying">
      <p>
        Some of the providers require a payment to store the encrypted
        authentication information.
      </p>
      <ul>
        {payments.map((x, i) => {
          return <li key={i}>{x}</li>;
        })}
      </ul>
      <button onClick={() => reducer.transition("pay", {})}>
        Check payment status now
      </button>
    </AnastasisClientFrame>
  );
}
