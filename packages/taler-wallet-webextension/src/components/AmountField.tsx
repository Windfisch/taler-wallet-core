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

import { Fragment, h, VNode } from "preact";
import { TextFieldHandler } from "../mui/handlers.js";
import { TextField } from "../mui/TextField.js";
import { ErrorText } from "./styled/index.js";

export function AmountField({
  label,
  handler,
  currency,
  required,
}: {
  label: VNode;
  required?: boolean;
  currency: string;
  handler: TextFieldHandler;
}): VNode {
  function positiveAmount(value: string): string {
    if (!value) return "";
    try {
      const num = Number.parseFloat(value);
      if (Number.isNaN(num) || num < 0) return handler.value;
      if (handler.onInput) {
        handler.onInput(value);
      }
      return value;
    } catch (e) {
      // do nothing
    }
    return handler.value;
  }
  return (
    <Fragment>
      <TextField
        label={label}
        type="number"
        min="0"
        step="0.1"
        variant="filled"
        error={!!handler.error}
        required={required}
        startAdornment={
          <div style={{ padding: "25px 12px 8px 12px" }}>{currency}</div>
        }
        value={handler.value}
        disabled={!handler.onInput}
        onInput={positiveAmount}
      />
      {handler.error && <ErrorText>{handler.error}</ErrorText>}
    </Fragment>
  );
}
