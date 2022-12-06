/*
 This file is part of GNU Taler
 (C) 2022 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
 *
 * @author Sebastian Javier Marchano (sebasjm)
 */

import { AmountJson, Amounts } from "@gnu-taler/taler-util";
import { styled } from "@linaria/react";
import { Fragment, h, VNode } from "preact";
import { useState } from "preact/hooks";
import { useTranslationContext } from "../context/translation.js";
import { Grid } from "../mui/Grid.js";
import { AmountFieldHandler, TextFieldHandler } from "../mui/handlers.js";
import { AmountField } from "./AmountField.js";

export default {
  title: "amountField",
};

function RenderAmount(): VNode {
  const [value, setValue] = useState<AmountJson | undefined>(undefined);

  const error = value === undefined ? undefined : undefined;

  const handler: AmountFieldHandler = {
    value: value ?? Amounts.zeroOfCurrency("USD"),
    onInput: async (e) => {
      setValue(e);
    },
    error,
  };
  const { i18n } = useTranslationContext();
  return (
    <Fragment>
      <AmountField
        required
        label={<i18n.Translate>Amount</i18n.Translate>}
        highestDenom={2000000}
        lowestDenom={0.01}
        handler={handler}
      />
      <p>
        <pre>{JSON.stringify(value, undefined, 2)}</pre>
      </p>
    </Fragment>
  );
}

export const AmountFieldExample = (): VNode => RenderAmount();
