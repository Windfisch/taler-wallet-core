/* eslint-disable @typescript-eslint/camelcase */
import { h, VNode } from "preact";
import { useAnastasisContext } from "../../context/anastasis";
import { AnastasisClientFrame, withProcessLabel } from "./index";

export function CountrySelectionScreen(): VNode {
  const reducer = useAnastasisContext()
  if (!reducer) {
    return <div>no reducer in context</div>
  }
  if (!reducer.currentReducerState || !("countries" in reducer.currentReducerState)) {
    return <div>invalid state</div>
  }
  const sel = (x: any): void => reducer.transition("select_country", {
    country_code: x.code,
    currencies: [x.currency],
  });
  return (
    <AnastasisClientFrame hideNext={"FIXME"} title={withProcessLabel(reducer, "Select Country")} >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {reducer.currentReducerState.countries!.map((x: any) => (
          <div key={x.name}>
            <button class="button" onClick={() => sel(x)} >
              {x.name} ({x.currency})
            </button>
          </div>
        ))}
      </div>
    </AnastasisClientFrame>
  );
}
