import { h, VNode } from "preact";
import { AnastasisClientFrame } from "./index";
import { SolveEntryProps } from "./SolveScreen";

export function SolveUnsupportedEntry(props: SolveEntryProps): VNode {
  return (
    <AnastasisClientFrame hideNext title="Recovery: Solve challenge">
      <p>{JSON.stringify(props.challenge)}</p>
      <p>Challenge not supported.</p>
    </AnastasisClientFrame>
  );
}
