/*
 This file is part of GNU Taler
 (C) 2021-2023 Taler Systems S.A.

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
import { AsyncButton } from "../../../components/exception/AsyncButton.js";
import {
  FormProvider,
  FormErrors,
} from "../../../components/form/FormProvider.js";
import { UpdateTokenModal } from "../../../components/modal/index.js";
import { useInstanceContext } from "../../../context/instance.js";
import { MerchantBackend } from "../../../declaration.js";
import { Translate, useTranslator } from "../../../i18n/index.js";
import { DefaultInstanceFormFields } from "../../../components/instance/DefaultInstanceFormFields.js";
import { PAYTO_REGEX } from "../../../utils/constants.js";
import { Amounts } from "@gnu-taler/taler-util";
import { undefinedIfEmpty } from "../../../utils/table.js";

type Entity = MerchantBackend.Instances.InstanceReconfigurationMessage & {
  auth_token?: string;
};

//MerchantBackend.Instances.InstanceAuthConfigurationMessage
interface Props {
  onUpdate: (d: Entity) => void;
  onChangeAuth: (
    d: MerchantBackend.Instances.InstanceAuthConfigurationMessage
  ) => Promise<void>;
  selected: MerchantBackend.Instances.QueryInstancesResponse;
  isLoading: boolean;
  onBack: () => void;
}

function convert(
  from: MerchantBackend.Instances.QueryInstancesResponse
): Entity {
  const { accounts, ...rest } = from;
  const payto_uris = accounts.filter((a) => a.active).map((a) => a.payto_uri);
  const defaults = {
    default_wire_fee_amortization: 1,
    default_pay_delay: { d_us: 2 * 1000 * 1000 * 60 * 60 }, //two hours
    default_wire_transfer_delay: { d_us: 2 * 1000 * 1000 * 60 * 60 * 2 }, //two hours
  };
  return { ...defaults, ...rest, payto_uris };
}

function getTokenValuePart(t?: string): string | undefined {
  if (!t) return t;
  const match = /secret-token:(.*)/.exec(t);
  if (!match || !match[1]) return undefined;
  return match[1];
}

export function UpdatePage({
  onUpdate,
  onChangeAuth,
  selected,
  onBack,
}: Props): VNode {
  const { id, token } = useInstanceContext();
  const currentTokenValue = getTokenValuePart(token);

  function updateToken(token: string | undefined | null) {
    const value =
      token && token.startsWith("secret-token:")
        ? token.substring("secret-token:".length)
        : token;

    if (!token) {
      onChangeAuth({ method: "external" });
    } else {
      onChangeAuth({ method: "token", token: `secret-token:${value}` });
    }
  }

  const [value, valueHandler] = useState<Partial<Entity>>(convert(selected));

  const i18n = useTranslator();

  const errors: FormErrors<Entity> = {
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
  const submit = async (): Promise<void> => {
    await onUpdate(value as Entity);
  };
  const [active, setActive] = useState(false);

  return (
    <div>
      <section class="section">
        <section class="hero is-hero-bar">
          <div class="hero-body">
            <div class="level">
              <div class="level-left">
                <div class="level-item">
                  <span class="is-size-4">
                    <Translate>Instance id</Translate>: <b>{id}</b>
                  </span>
                </div>
              </div>
              <div class="level-right">
                <div class="level-item">
                  <h1 class="title">
                    <button
                      class="button is-danger"
                      data-tooltip={i18n`Change the authorization method use for this instance.`}
                      onClick={(): void => {
                        setActive(!active);
                      }}
                    >
                      <div class="icon is-left">
                        <i class="mdi mdi-lock-reset" />
                      </div>
                      <span>
                        <Translate>Manage access token</Translate>
                      </span>
                    </button>
                  </h1>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div class="columns">
          <div class="column" />
          <div class="column is-four-fifths">
            {active && (
              <UpdateTokenModal
                oldToken={currentTokenValue}
                onCancel={() => {
                  setActive(false);
                }}
                onClear={() => {
                  updateToken(null);
                  setActive(false);
                }}
                onConfirm={(newToken) => {
                  updateToken(newToken);
                  setActive(false);
                }}
              />
            )}
          </div>
          <div class="column" />
        </div>
        <hr />

        <div class="columns">
          <div class="column" />
          <div class="column is-four-fifths">
            <FormProvider<Entity>
              errors={errors}
              object={value}
              valueHandler={valueHandler}
            >
              <DefaultInstanceFormFields showId={false} />
            </FormProvider>

            <div class="buttons is-right mt-4">
              <button
                class="button"
                onClick={onBack}
                data-tooltip="cancel operation"
              >
                <Translate>Cancel</Translate>
              </button>

              <AsyncButton
                onClick={submit}
                data-tooltip={
                  hasErrors
                    ? i18n`Need to complete marked fields`
                    : "confirm operation"
                }
                disabled={hasErrors}
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
