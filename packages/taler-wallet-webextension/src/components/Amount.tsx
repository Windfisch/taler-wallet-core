import { AmountJson, Amounts, AmountString } from "@gnu-taler/taler-util";
import { h, VNode, Fragment } from "preact";

export function Amount({ value }: { value: AmountJson | AmountString }): VNode {
  const aj = Amounts.jsonifyAmount(value);
  const amount = Amounts.stringifyValue(aj, 2);
  return (
    <Fragment>
      {amount}&nbsp;{aj.currency}
    </Fragment>
  );
}
