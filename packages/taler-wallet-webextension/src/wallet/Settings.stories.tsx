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

import { createExample } from "../test-utils.js";
import { SettingsView as TestedComponent } from "./Settings.js";

export default {
  title: "wallet/settings",
  component: TestedComponent,
  argTypes: {
    setDeviceName: () => Promise.resolve(),
  },
};

export const AllOff = createExample(TestedComponent, {
  deviceName: "this-is-the-device-name",
  permissionToggle: { value: false, button: {} },
  setDeviceName: () => Promise.resolve(),
});

export const OneChecked = createExample(TestedComponent, {
  deviceName: "this-is-the-device-name",
  permissionToggle: { value: false, button: {} },
  setDeviceName: () => Promise.resolve(),
});

export const WithOneExchange = createExample(TestedComponent, {
  deviceName: "this-is-the-device-name",
  permissionToggle: { value: false, button: {} },
  setDeviceName: () => Promise.resolve(),
  knownExchanges: [
    {
      currency: "USD",
      exchangeBaseUrl: "http://exchange.taler",
      tos: {
        currentVersion: "1",
        acceptedVersion: "1",
        content: "content of tos",
        contentType: "text/plain",
      },
      paytoUris: ["payto://x-taler-bank/bank.rpi.sebasjm.com/exchangeminator"],
    },
  ],
});

export const WithExchangeInDifferentState = createExample(TestedComponent, {
  deviceName: "this-is-the-device-name",
  permissionToggle: { value: false, button: {} },
  setDeviceName: () => Promise.resolve(),
  knownExchanges: [
    {
      currency: "USD",
      exchangeBaseUrl: "http://exchange1.taler",
      tos: {
        currentVersion: "1",
        acceptedVersion: "1",
        content: "content of tos",
        contentType: "text/plain",
      },
      paytoUris: ["payto://x-taler-bank/bank.rpi.sebasjm.com/exchangeminator"],
    },
    {
      currency: "USD",
      exchangeBaseUrl: "http://exchange2.taler",
      tos: {
        currentVersion: "2",
        acceptedVersion: "1",
        content: "content of tos",
        contentType: "text/plain",
      },
      paytoUris: ["payto://x-taler-bank/bank.rpi.sebasjm.com/exchangeminator"],
    },
    {
      currency: "USD",
      exchangeBaseUrl: "http://exchange3.taler",
      tos: {
        currentVersion: "1",
        content: "content of tos",
        contentType: "text/plain",
      },
      paytoUris: ["payto://x-taler-bank/bank.rpi.sebasjm.com/exchangeminator"],
    },
  ],
});
