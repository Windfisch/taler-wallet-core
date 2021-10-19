import { h, VNode } from "preact";
import { CommonReducerProps, AnastasisClientFrame, withProcessLabel } from "./index";

export function ContinentSelectionScreen(props: CommonReducerProps): VNode {
  const { reducer, reducerState } = props;
  const sel = (x: string): void => reducer.transition("select_continent", { continent: x });
  return (
    <AnastasisClientFrame
      hideNext
      title={withProcessLabel(reducer, "Select Continent")}
    >
      {reducerState.continents.map((x: any) => (
        <button onClick={() => sel(x.name)} key={x.name}>
          {x.name}
        </button>
      ))}
    </AnastasisClientFrame>
  );
}
