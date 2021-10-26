import { h, VNode } from "preact";
import { useAnastasisContext } from "../../context/anastasis";
import { AnastasisClientFrame, withProcessLabel } from "./index";

export function ContinentSelectionScreen(): VNode {
  const reducer = useAnastasisContext()
  if (!reducer || !reducer.currentReducerState || !("continents" in reducer.currentReducerState)) {
    return <div />
  }
  const select = (continent: string) => (): void => reducer.transition("select_continent", { continent });
  return (
    <AnastasisClientFrame hideNext title={withProcessLabel(reducer, "Select Continent")}>
      {reducer.currentReducerState.continents.map((x: any) => (
        <button class="button" onClick={select(x.name)} key={x.name}>
          {x.name}
        </button>
      ))}
    </AnastasisClientFrame>
  );
}
