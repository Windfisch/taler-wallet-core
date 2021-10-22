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
    <AnastasisClientFrame hideNext title={withProcessLabel(reducer, "Select Country")} >
      {reducer.currentReducerState.countries.map((x: any) => (
        <button onClick={() => sel(x)} key={x.name}>
          {x.name} ({x.currency})
        </button>
      ))}
    </AnastasisClientFrame>
  );
}
