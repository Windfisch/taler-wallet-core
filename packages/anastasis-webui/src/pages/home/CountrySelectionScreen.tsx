/* eslint-disable @typescript-eslint/camelcase */
import { h, VNode } from "preact";
import { CommonReducerProps, AnastasisClientFrame, withProcessLabel } from "./index";

export function CountrySelectionScreen(props: CommonReducerProps): VNode {
  const { reducer, reducerState } = props;
  const sel = (x: any): void => reducer.transition("select_country", {
    country_code: x.code,
    currencies: [x.currency],
  });
  return (
    <AnastasisClientFrame
      hideNext
      title={withProcessLabel(reducer, "Select Country")}
    >
      {reducerState.countries.map((x: any) => (
        <button onClick={() => sel(x)} key={x.name}>
          {x.name} ({x.currency})
        </button>
      ))}
    </AnastasisClientFrame>
  );
}
