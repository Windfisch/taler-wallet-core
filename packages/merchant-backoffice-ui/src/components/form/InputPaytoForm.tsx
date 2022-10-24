/*
 This file is part of GNU Taler
 (C) 2021 Taler Systems S.A.

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
import { h, VNode, Fragment } from "preact";
import { useCallback, useState } from "preact/hooks";
import { Translate, Translator, useTranslator } from "../../i18n";
import { COUNTRY_TABLE } from "../../utils/constants";
import { FormErrors, FormProvider } from "./FormProvider";
import { Input } from "./Input";
import { InputGroup } from "./InputGroup";
import { InputSelector } from "./InputSelector";
import { InputProps, useField } from "./useField";

export interface Props<T> extends InputProps<T> {
  isValid?: (e: any) => boolean;
}

// https://datatracker.ietf.org/doc/html/rfc8905
type Entity = {
  // iban, bitcoin, x-taler-bank. it defined the format
  target: string;
  // path1 if the first field to be used
  path1: string;
  // path2 if the second field to be used, optional
  path2?: string;
  // options of the payto uri
  options: {
    "receiver-name"?: string;
    sender?: string;
    message?: string;
    amount?: string;
    instruction?: string;
    [name: string]: string | undefined;
  };
};

function isEthereumAddress(address: string) {
  if (!/^(0x)?[0-9a-f]{40}$/i.test(address)) {
    return false;
  } else if (
    /^(0x|0X)?[0-9a-f]{40}$/.test(address) ||
    /^(0x|0X)?[0-9A-F]{40}$/.test(address)
  ) {
    return true;
  }
  return checkAddressChecksum(address);
}

function checkAddressChecksum(address: string) {
  //TODO implement ethereum checksum
  return true;
}

function validateBitcoin(addr: string, i18n: Translator): string | undefined {
  try {
    const valid = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}$/.test(addr);
    if (valid) return undefined;
  } catch (e) {
    console.log(e);
  }
  return i18n`This is not a valid bitcoin address.`;
}

function validateEthereum(addr: string, i18n: Translator): string | undefined {
  try {
    const valid = isEthereumAddress(addr);
    if (valid) return undefined;
  } catch (e) {
    console.log(e);
  }
  return i18n`This is not a valid Ethereum address.`;
}

/**
 * An IBAN is validated by converting it into an integer and performing a
 * basic mod-97 operation (as described in ISO 7064) on it.
 * If the IBAN is valid, the remainder equals 1.
 *
 * The algorithm of IBAN validation is as follows:
 * 1.- Check that the total IBAN length is correct as per the country. If not, the IBAN is invalid
 * 2.- Move the four initial characters to the end of the string
 * 3.- Replace each letter in the string with two digits, thereby expanding the string, where A = 10, B = 11, ..., Z = 35
 * 4.- Interpret the string as a decimal integer and compute the remainder of that number on division by 97
 *
 * If the remainder is 1, the check digit test is passed and the IBAN might be valid.
 *
 */
function validateIBAN(iban: string, i18n: Translator): string | undefined {
  // Check total length
  if (iban.length < 4)
    return i18n`IBAN numbers usually have more that 4 digits`;
  if (iban.length > 34)
    return i18n`IBAN numbers usually have less that 34 digits`;

  const A_code = "A".charCodeAt(0);
  const Z_code = "Z".charCodeAt(0);
  const IBAN = iban.toUpperCase();
  // check supported country
  const code = IBAN.substr(0, 2);
  const found = code in COUNTRY_TABLE;
  if (!found) return i18n`IBAN country code not found`;

  // 2.- Move the four initial characters to the end of the string
  const step2 = IBAN.substr(4) + iban.substr(0, 4);
  const step3 = Array.from(step2)
    .map((letter) => {
      const code = letter.charCodeAt(0);
      if (code < A_code || code > Z_code) return letter;
      return `${letter.charCodeAt(0) - "A".charCodeAt(0) + 10}`;
    })
    .join("");

  function calculate_iban_checksum(str: string): number {
    const numberStr = str.substr(0, 5);
    const rest = str.substr(5);
    const number = parseInt(numberStr, 10);
    const result = number % 97;
    if (rest.length > 0) {
      return calculate_iban_checksum(`${result}${rest}`);
    }
    return result;
  }

  const checksum = calculate_iban_checksum(step3);
  if (checksum !== 1) return i18n`IBAN number is not valid, checksum is wrong`;
  return undefined;
}

// const targets = ['ach', 'bic', 'iban', 'upi', 'bitcoin', 'ilp', 'void', 'x-taler-bank']
const targets = [
  "Choose one...",
  "iban",
  "x-taler-bank",
  "bitcoin",
  "ethereum",
];
const noTargetValue = targets[0];
const defaultTarget = { target: noTargetValue, options: {} };

function undefinedIfEmpty<T>(obj: T): T | undefined {
  return Object.keys(obj).some((k) => (obj as any)[k] !== undefined)
    ? obj
    : undefined;
}

export function InputPaytoForm<T>({
  name,
  readonly,
  label,
  tooltip,
}: Props<keyof T>): VNode {
  const { value: paytos, onChange } = useField<T>(name);

  const [value, valueHandler] = useState<Partial<Entity>>(defaultTarget);

  let payToPath;
  if (value.target === "iban" && value.path1) {
    payToPath = `/${value.path1.toUpperCase()}`;
  } else if (value.path1) {
    if (value.path2) {
      payToPath = `/${value.path1}/${value.path2}`;
    } else {
      payToPath = `/${value.path1}`;
    }
  }
  const i18n = useTranslator();

  const ops = value.options!;
  const url = tryUrl(`payto://${value.target}${payToPath}`);
  if (url) {
    Object.keys(ops).forEach((opt_key) => {
      const opt_value = ops[opt_key];
      if (opt_value) url.searchParams.set(opt_key, opt_value);
    });
  }
  const paytoURL = !url ? "" : url.toString();

  const errors: FormErrors<Entity> = {
    target: value.target === noTargetValue ? i18n`required` : undefined,
    path1: !value.path1
      ? i18n`required`
      : value.target === "iban"
      ? validateIBAN(value.path1, i18n)
      : value.target === "bitcoin"
      ? validateBitcoin(value.path1, i18n)
      : value.target === "ethereum"
      ? validateEthereum(value.path1, i18n)
      : undefined,
    path2:
      value.target === "x-taler-bank"
        ? !value.path2
          ? i18n`required`
          : undefined
        : undefined,
    options: undefinedIfEmpty({
      "receiver-name": !value.options?.["receiver-name"]
        ? i18n`required`
        : undefined,
    }),
  };

  const hasErrors = Object.keys(errors).some(
    (k) => (errors as any)[k] !== undefined
  );

  const submit = useCallback((): void => {
    const alreadyExists =
      paytos.findIndex((x: string) => x === paytoURL) !== -1;
    if (!alreadyExists) {
      onChange([paytoURL, ...paytos] as any);
    }
    valueHandler(defaultTarget);
  }, [value]);

  //FIXME: translating plural singular
  return (
    <InputGroup name="payto" label={label} fixed tooltip={tooltip}>
      <FormProvider<Entity>
        name="tax"
        errors={errors}
        object={value}
        valueHandler={valueHandler}
      >
        <InputSelector<Entity>
          name="target"
          label={i18n`Target type`}
          tooltip={i18n`Method to use for wire transfer`}
          values={targets}
          toStr={(v) => (v === noTargetValue ? i18n`Choose one...` : v)}
        />

        {value.target === "ach" && (
          <Fragment>
            <Input<Entity>
              name="path1"
              label={i18n`Routing`}
              tooltip={i18n`Routing number.`}
            />
            <Input<Entity>
              name="path2"
              label={i18n`Account`}
              tooltip={i18n`Account number.`}
            />
          </Fragment>
        )}
        {value.target === "bic" && (
          <Fragment>
            <Input<Entity>
              name="path1"
              label={i18n`Code`}
              tooltip={i18n`Business Identifier Code.`}
            />
          </Fragment>
        )}
        {value.target === "iban" && (
          <Fragment>
            <Input<Entity>
              name="path1"
              label={i18n`Account`}
              tooltip={i18n`Bank Account Number.`}
              inputExtra={{ style: { textTransform: "uppercase" } }}
            />
          </Fragment>
        )}
        {value.target === "upi" && (
          <Fragment>
            <Input<Entity>
              name="path1"
              label={i18n`Account`}
              tooltip={i18n`Unified Payment Interface.`}
            />
          </Fragment>
        )}
        {value.target === "bitcoin" && (
          <Fragment>
            <Input<Entity>
              name="path1"
              label={i18n`Address`}
              tooltip={i18n`Bitcoin protocol.`}
            />
          </Fragment>
        )}
        {value.target === "ethereum" && (
          <Fragment>
            <Input<Entity>
              name="path1"
              label={i18n`Address`}
              tooltip={i18n`Ethereum protocol.`}
            />
          </Fragment>
        )}
        {value.target === "ilp" && (
          <Fragment>
            <Input<Entity>
              name="path1"
              label={i18n`Address`}
              tooltip={i18n`Interledger protocol.`}
            />
          </Fragment>
        )}
        {value.target === "void" && <Fragment />}
        {value.target === "x-taler-bank" && (
          <Fragment>
            <Input<Entity>
              name="path1"
              label={i18n`Host`}
              tooltip={i18n`Bank host.`}
            />
            <Input<Entity>
              name="path2"
              label={i18n`Account`}
              tooltip={i18n`Bank account.`}
            />
          </Fragment>
        )}

        {value.target !== noTargetValue && (
          <Input
            name="options.receiver-name"
            label={i18n`Name`}
            tooltip={i18n`Bank account owner's name.`}
          />
        )}

        <div class="field is-horizontal">
          <div class="field-label is-normal" />
          <div class="field-body" style={{ display: "block" }}>
            {paytos.map((v: any, i: number) => (
              <div
                key={i}
                class="tags has-addons mt-3 mb-0 mr-3"
                style={{ flexWrap: "nowrap" }}
              >
                <span
                  class="tag is-medium is-info mb-0"
                  style={{ maxWidth: "90%" }}
                >
                  {v}
                </span>
                <a
                  class="tag is-medium is-danger is-delete mb-0"
                  onClick={() => {
                    onChange(paytos.filter((f: any) => f !== v) as any);
                  }}
                />
              </div>
            ))}
            {!paytos.length && i18n`No accounts yet.`}
          </div>
        </div>

        {value.target !== noTargetValue && (
          <div class="buttons is-right mt-5">
            <button
              class="button is-info"
              data-tooltip={i18n`add tax to the tax list`}
              disabled={hasErrors}
              onClick={submit}
            >
              <Translate>Add</Translate>
            </button>
          </div>
        )}
      </FormProvider>
    </InputGroup>
  );
}

function tryUrl(s: string): URL | undefined {
  try {
    return new URL(s);
  } catch (e) {
    return undefined;
  }
}
