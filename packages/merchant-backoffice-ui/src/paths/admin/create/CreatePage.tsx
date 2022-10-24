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

import { h, VNode } from "preact";
import { useState } from "preact/hooks";
import * as yup from "yup";
import { AsyncButton } from "../../../components/exception/AsyncButton";
import {
  FormErrors,
  FormProvider,
} from "../../../components/form/FormProvider";
import { SetTokenNewInstanceModal } from "../../../components/modal";
import { MerchantBackend } from "../../../declaration";
import { Translate, useTranslator } from "../../../i18n";
import { DefaultInstanceFormFields } from "../../../components/instance/DefaultInstanceFormFields";
import { INSTANCE_ID_REGEX, PAYTO_REGEX } from "../../../utils/constants";
import { Amounts } from "@gnu-taler/taler-util";

export type Entity = MerchantBackend.Instances.InstanceConfigurationMessage & {
  auth_token?: string;
};

interface Props {
  onCreate: (d: Entity) => Promise<void>;
  onBack?: () => void;
  forceId?: string;
}

function with_defaults(id?: string): Partial<Entity> {
  return {
    id,
    payto_uris: [],
    default_pay_delay: { d_us: 2 * 1000 * 60 * 60 * 1000 }, // two hours
    default_wire_fee_amortization: 1,
    default_wire_transfer_delay: { d_us: 1000 * 2 * 60 * 60 * 24 * 1000 }, // two days
  };
}

function undefinedIfEmpty<T>(obj: T): T | undefined {
  return Object.keys(obj).some((k) => (obj as any)[k] !== undefined)
    ? obj
    : undefined;
}

export function CreatePage({ onCreate, onBack, forceId }: Props): VNode {
  const [value, valueHandler] = useState(with_defaults(forceId));
  const [isTokenSet, updateIsTokenSet] = useState<boolean>(false);
  const [isTokenDialogActive, updateIsTokenDialogActive] =
    useState<boolean>(false);

  const i18n = useTranslator();

  const errors: FormErrors<Entity> = {
    id: !value.id
      ? i18n`required`
      : !INSTANCE_ID_REGEX.test(value.id)
      ? i18n`is not valid`
      : undefined,
    name: !value.name ? i18n`required` : undefined,
    payto_uris:
      !value.payto_uris || !value.payto_uris.length
        ? i18n`required`
        : undefinedIfEmpty(
            value.payto_uris.map((p) => {
              return !PAYTO_REGEX.test(p) ? i18n`is not valid` : undefined;
            })
          ),
    default_max_deposit_fee: !value.default_max_deposit_fee
      ? i18n`required`
      : !Amounts.parse(value.default_max_deposit_fee)
      ? i18n`invalid format`
      : undefined,
    default_max_wire_fee: !value.default_max_wire_fee
      ? i18n`required`
      : !Amounts.parse(value.default_max_wire_fee)
      ? i18n`invalid format`
      : undefined,
    default_wire_fee_amortization:
      value.default_wire_fee_amortization === undefined
        ? i18n`required`
        : isNaN(value.default_wire_fee_amortization)
        ? i18n`is not a number`
        : value.default_wire_fee_amortization < 1
        ? i18n`must be 1 or greater`
        : undefined,
    default_pay_delay: !value.default_pay_delay ? i18n`required` : undefined,
    default_wire_transfer_delay: !value.default_wire_transfer_delay
      ? i18n`required`
      : undefined,
    address: undefinedIfEmpty({
      address_lines:
        value.address?.address_lines && value.address?.address_lines.length > 7
          ? i18n`max 7 lines`
          : undefined,
    }),
    jurisdiction: undefinedIfEmpty({
      address_lines:
        value.address?.address_lines && value.address?.address_lines.length > 7
          ? i18n`max 7 lines`
          : undefined,
    }),
  };

  const hasErrors = Object.keys(errors).some(
    (k) => (errors as any)[k] !== undefined
  );

  const submit = (): Promise<void> => {
    // use conversion instead of this
    const newToken = value.auth_token;
    value.auth_token = undefined;
    value.auth =
      newToken === null || newToken === undefined
        ? { method: "external" }
        : { method: "token", token: `secret-token:${newToken}` };
    if (!value.address) value.address = {};
    if (!value.jurisdiction) value.jurisdiction = {};
    // remove above use conversion
    // schema.validateSync(value, { abortEarly: false })
    return onCreate(value as Entity);
  };

  function updateToken(token: string | null) {
    valueHandler((old) => ({
      ...old,
      auth_token: token === null ? undefined : token,
    }));
  }

  return (
    <div>
      <div class="columns">
        <div class="column" />
        <div class="column is-four-fifths">
          {isTokenDialogActive && (
            <SetTokenNewInstanceModal
              onCancel={() => {
                updateIsTokenDialogActive(false);
                updateIsTokenSet(false);
              }}
              onClear={() => {
                updateToken(null);
                updateIsTokenDialogActive(false);
                updateIsTokenSet(true);
              }}
              onConfirm={(newToken) => {
                updateToken(newToken);
                updateIsTokenDialogActive(false);
                updateIsTokenSet(true);
              }}
            />
          )}
        </div>
        <div class="column" />
      </div>

      <section class="hero is-hero-bar">
        <div class="hero-body">
          <div class="level">
            <div class="level-item has-text-centered">
              <h1 class="title">
                <button
                  class="button is-danger has-tooltip-bottom"
                  data-tooltip={i18n`change authorization configuration`}
                  onClick={() => updateIsTokenDialogActive(true)}
                >
                  <div class="icon is-centered">
                    <i class="mdi mdi-lock-reset" />
                  </div>
                  <span>
                    <Translate>Set access token</Translate>
                  </span>
                </button>
              </h1>
            </div>
          </div>
        </div>
      </section>

      <section class="section is-main-section">
        <div class="columns">
          <div class="column" />
          <div class="column is-four-fifths">
            <FormProvider<Entity>
              errors={errors}
              object={value}
              valueHandler={valueHandler}
            >
              <DefaultInstanceFormFields readonlyId={!!forceId} showId={true} />
            </FormProvider>

            <div class="buttons is-right mt-5">
              {onBack && (
                <button class="button" onClick={onBack}>
                  <Translate>Cancel</Translate>
                </button>
              )}
              <AsyncButton
                onClick={submit}
                disabled={!isTokenSet || hasErrors}
                data-tooltip={
                  hasErrors
                    ? i18n`Need to complete marked fields and choose authorization method`
                    : "confirm operation"
                }
              >
                <Translate>Confirm</Translate>
              </AsyncButton>
            </div>
          </div>
          <div class="column" />
        </div>
      </section>
    </div>
  );
}
