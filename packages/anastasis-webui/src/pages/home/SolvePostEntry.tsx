import { h, VNode } from "preact";
import { useState } from "preact/hooks";
import { useAnastasisContext } from "../../context/anastasis";
import { AnastasisClientFrame } from "./index";
import { LabeledInput } from "../../components/fields/LabeledInput";
import { SolveEntryProps } from "./SolveScreen";

export function SolvePostEntry({ challenge, feedback }: SolveEntryProps): VNode {
  const [answer, setAnswer] = useState("");
  const reducer = useAnastasisContext()
  const next = (): void => {
    if (reducer) reducer.transition("solve_challenge", { answer })
  };
  return (
    <AnastasisClientFrame
      title="Recovery: Solve challenge"
      onNext={() => next()}
    >
      <p>Feedback: {JSON.stringify(feedback)}</p>
      <p>{challenge.instructions}</p>
      <LabeledInput label="Answer" grabFocus bind={[answer, setAnswer]} />
    </AnastasisClientFrame>
  );
}
