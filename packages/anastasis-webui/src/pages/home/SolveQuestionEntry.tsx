import { h, VNode } from "preact";
import { useState } from "preact/hooks";
import { AnastasisClientFrame, LabeledInput } from "./index";
import { SolveEntryProps } from "./SolveScreen";

export function SolveQuestionEntry(props: SolveEntryProps): VNode {
  const [answer, setAnswer] = useState("");
  const { reducer, challenge, feedback } = props;
  const next = (): void => reducer.transition("solve_challenge", {
    answer,
  });
  return (
    <AnastasisClientFrame
      title="Recovery: Solve challenge"
      onNext={() => next()}
    >
      <p>Feedback: {JSON.stringify(feedback)}</p>
      <p>Question: {challenge.instructions}</p>
      <LabeledInput label="Answer" grabFocus bind={[answer, setAnswer]} />
    </AnastasisClientFrame>
  );
}
