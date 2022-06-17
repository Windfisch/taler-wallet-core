/*
 This file is part of GNU Anastasis
 (C) 2021-2022 Anastasis SARL

 GNU Anastasis is free software; you can redistribute it and/or modify it under the
 terms of the GNU Affero General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Anastasis is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License along with
 GNU Anastasis; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
 *
 * @author Sebastian Javier Marchano (sebasjm)
 */

import { AuthenticationProviderStatusOk } from "@gnu-taler/anastasis-core";
import { createExampleWithoutAnastasis } from "../../../utils/index.jsx";
import { WithoutProviderType, WithProviderType } from "./views.jsx";

export default {
  args: {
    order: 1,
  },
  argTypes: {
    onUpdate: { action: "onUpdate" },
    onBack: { action: "onBack" },
  },
};

export const NewProvider = createExampleWithoutAnastasis(WithoutProviderType, {
  authProvidersByStatus: {
    ok: [
      {
        business_name: "X provider",
        status: "ok",
        storage_limit_in_megabytes: 5,
        methods: [
          {
            type: "question",
            usage_fee: "KUDOS:1",
          },
        ],
        url: "",
      } as AuthenticationProviderStatusOk & { url: string },
    ],
    "not-contacted": [],
    disabled: [],
    error: [],
  },
});

export const NewProviderWithoutProviderList = createExampleWithoutAnastasis(
  WithoutProviderType,
  {
    authProvidersByStatus: {
      ok: [],
      "not-contacted": [],
      disabled: [],
      error: [],
    },
  },
);

export const NewSmsProvider = createExampleWithoutAnastasis(WithProviderType, {
  authProvidersByStatus: {
    ok: [],
    "not-contacted": [],
    disabled: [],
    error: [],
  },
  providerLabel: "sms",
});

export const NewIBANProvider = createExampleWithoutAnastasis(WithProviderType, {
  authProvidersByStatus: {
    ok: [],
    "not-contacted": [],
    disabled: [],
    error: [],
  },
  providerLabel: "IBAN",
});
