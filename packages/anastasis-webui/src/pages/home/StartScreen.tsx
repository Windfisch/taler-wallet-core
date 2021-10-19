import { h, VNode } from "preact";
import { AnastasisReducerApi } from "../../hooks/use-anastasis-reducer";
import { AnastasisClientFrame } from "./index";

export function StartScreen(props: { reducer: AnastasisReducerApi; }): VNode {
  return (
    <AnastasisClientFrame hideNav title="Home">
      <button autoFocus onClick={() => props.reducer.startBackup()}>
        Backup
      </button>
      <button onClick={() => props.reducer.startRecover()}>Recover</button>
    </AnastasisClientFrame>
  );
}
