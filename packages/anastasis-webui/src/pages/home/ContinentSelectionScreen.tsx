import { h, VNode } from "preact";
import { useAnastasisContext } from "../../context/anastasis";
import { AnastasisClientFrame, withProcessLabel } from "./index";

export function ContinentSelectionScreen(): VNode {
  const reducer = useAnastasisContext()
  if (!reducer || !reducer.currentReducerState || !("continents" in reducer.currentReducerState)) {
    return <div />
  }
  const sel = (x: string): void => reducer.transition("select_continent", { continent: x });
  return (
    <AnastasisClientFrame hideNext title={withProcessLabel(reducer, "Select Continent")}>
      {reducer.currentReducerState.continents.map((x: any) => (
        <button onClick={() => sel(x.name)} key={x.name}>
          {x.name}
        </button>
      ))}
    </AnastasisClientFrame>
  );
}
