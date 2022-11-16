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

import { createExample } from "../../test-utils.js";
import { ConfirmProviderView, SelectProviderView } from "./views.js";

export default {
  title: "wallet/backup/confirm",
};

export const DemoService = createExample(ConfirmProviderView, {
  url: "https://sync.demo.taler.net/",
  provider: {
    annual_fee: "KUDOS:0.1",
    storage_limit_in_megabytes: 20,
    version: "1",
  },
  tos: {
    button: {},
  },
  onAccept: {},
  onCancel: {},
});

export const FreeService = createExample(ConfirmProviderView, {
  url: "https://sync.taler:9667/",
  provider: {
    annual_fee: "ARS:0",
    storage_limit_in_megabytes: 20,
    version: "1",
  },
  tos: {
    button: {},
  },
  onAccept: {},
  onCancel: {},
});

export const Initial = createExample(SelectProviderView, {
  url: { value: "" },
  name: { value: "" },
  onCancel: {},
  onConfirm: {},
});

export const WithValue = createExample(SelectProviderView, {
  url: {
    value: "sync.demo.taler.net",
  },
  name: {
    value: "Demo backup service",
  },
  onCancel: {},
  onConfirm: {},
});

export const WithConnectionError = createExample(SelectProviderView, {
  url: {
    value: "sync.demo.taler.net",
    error: "Network error",
  },
  name: {
    value: "Demo backup service",
  },
  onCancel: {},
  onConfirm: {},
});

export const WithClientError = createExample(SelectProviderView, {
  url: {
    value: "sync.demo.taler.net",
    error: "URL may not be right: (404) Not Found",
  },
  name: {
    value: "Demo backup service",
  },
  onCancel: {},
  onConfirm: {},
});

export const WithServerError = createExample(SelectProviderView, {
  url: {
    value: "sync.demo.taler.net",
    error: "Try another server: (500) Internal Server Error",
  },
  name: {
    value: "Demo backup service",
  },
  onCancel: {},
  onConfirm: {},
});
