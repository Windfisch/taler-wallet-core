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

import { parsePaytoUri } from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";
import { useState } from "preact/hooks";
import { ErrorMessage } from "../../components/ErrorMessage.js";
import { LoadingError } from "../../components/LoadingError.js";
import { SelectList } from "../../components/SelectList.js";
import { Input, LightText, SubTitle } from "../../components/styled/index.js";
import { useTranslationContext } from "../../context/translation.js";
import { Button } from "../../mui/Button.js";
import { TextFieldHandler } from "../../mui/handlers.js";
import { TextField } from "../../mui/TextField.js";
import { State } from "./index.js";

export function LoadingUriView({ error }: State.LoadingUriError): VNode {
  const { i18n } = useTranslationContext();

  return (
    <LoadingError
      title={<i18n.Translate>Could not load</i18n.Translate>}
      error={error}
    />
  );
}

export function ReadyView({
  currency,
  error,
  accountType,
  alias,
  onAccountAdded,
  onCancel,
  uri,
}: State.Ready): VNode {
  const { i18n } = useTranslationContext();

  return (
    <Fragment>
      <section>
        <SubTitle>
          <i18n.Translate>Add bank account for {currency}</i18n.Translate>
        </SubTitle>
        <LightText>
          <i18n.Translate>
            Enter the URL of an exchange you trust.
          </i18n.Translate>
        </LightText>

        {error && (
          <ErrorMessage
            title={<i18n.Translate>Unable add this account</i18n.Translate>}
            description={error}
          />
        )}
        <p>
          <Input>
            <SelectList
              label={<i18n.Translate>Select account type</i18n.Translate>}
              list={accountType.list}
              name="accountType"
              value={accountType.value}
              onChange={accountType.onChange}
            />
          </Input>
        </p>
        {accountType.value === "" ? undefined : (
          <Fragment>
            <p>
              <CustomFieldByAccountType type={accountType.value} field={uri} />
            </p>
            <p>
              <TextField
                label="Account alias"
                variant="standard"
                required
                fullWidth
                disabled={accountType.value === ""}
                value={alias.value}
                onChange={alias.onInput}
              />
            </p>
          </Fragment>
        )}
      </section>
      <footer>
        <Button
          variant="contained"
          color="secondary"
          onClick={onCancel.onClick}
        >
          <i18n.Translate>Cancel</i18n.Translate>
        </Button>
        <Button variant="contained" onClick={onAccountAdded.onClick}>
          <i18n.Translate>Add</i18n.Translate>
        </Button>
      </footer>
    </Fragment>
  );
}

function CustomFieldByAccountType({
  type,
  field,
}: {
  type: string;
  field: TextFieldHandler;
}): VNode {
  const p = parsePaytoUri(field.value);
  const parts = !p ? [] : p.targetPath.split("/");
  const initialPart1 = parts.length > 0 ? parts[0] : "";
  const initialPart2 = parts.length > 1 ? parts[1] : "";
  const [part1, setPart1] = useState(initialPart1);
  const [part2, setPart2] = useState(initialPart2);
  function updateField(): void {
    if (part1 && part2) {
      field.onInput(`payto://${type}/${part1}/${part2}`);
    } else {
      if (part1) field.onInput(`payto://${type}/${part1}`);
    }
  }

  if (type === "bitcoin") {
    return (
      <Fragment>
        {field.error && <ErrorMessage title={<span>{field.error}</span>} />}
        <TextField
          label="Bitcoin address"
          variant="standard"
          required
          fullWidth
          value={part1}
          onChange={(v) => {
            setPart1(v);
            updateField();
          }}
        />
      </Fragment>
    );
  }
  if (type === "x-taler-bank") {
    return (
      <Fragment>
        {field.error && <ErrorMessage title={<span>{field.error}</span>} />}
        <TextField
          label="Bank host"
          variant="standard"
          required
          fullWidth
          value={part1}
          onChange={(v) => {
            setPart1(v);
            updateField();
          }}
        />{" "}
        <TextField
          label="Bank account"
          variant="standard"
          required
          fullWidth
          value={part2}
          onChange={(v) => {
            setPart2(v);
            updateField();
          }}
        />
      </Fragment>
    );
  }
  if (type === "iban") {
    return (
      <Fragment>
        {field.error && <ErrorMessage title={<span>{field.error}</span>} />}
        <TextField
          label="IBAN number"
          variant="standard"
          required
          fullWidth
          value={part1}
          onChange={(v) => {
            setPart1(v);
            updateField();
          }}
        />
      </Fragment>
    );
  }
  return <Fragment />;
}
