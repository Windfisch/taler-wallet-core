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

import { parsePaytoUri } from "@gnu-taler/taler-util";
import { createExample } from "../test-utils.js";
import { ReserveCreated as TestedComponent } from "./ReserveCreated.js";

export default {
  title: "wallet/manual withdraw/reserve created",
  component: TestedComponent,
  argTypes: {},
};

export const TalerBank = createExample(TestedComponent, {
  reservePub: "A05AJGMFNSK4Q62NXR2FKNDB1J4EXTYQTE7VA4M9GZQ4TR06YBNG",
  paytoURI: parsePaytoUri(
    "payto://x-taler-bank/bank.taler:5882/exchangeminator?amount=COL%3A1&message=Taler+Withdrawal+A05AJGMFNSK4Q62NXR2FKNDB1J4EXTYQTE7VA4M9GZQ4TR06YBNG",
  ),
  amount: {
    currency: "USD",
    value: 10,
    fraction: 0,
  },
  exchangeBaseUrl: "https://exchange.demo.taler.net",
});

export const IBAN = createExample(TestedComponent, {
  reservePub: "A05AJGMFNSK4Q62NXR2FKNDB1J4EXTYQTE7VA4M9GZQ4TR06YBNG",
  paytoURI: parsePaytoUri(
    "payto://iban/ES8877998399652238?amount=COL%3A1&message=Taler+Withdrawal+A05AJGMFNSK4Q62NXR2FKNDB1J4EXTYQTE7VA4M9GZQ4TR06YBNG",
  ),
  amount: {
    currency: "USD",
    value: 10,
    fraction: 0,
  },
  exchangeBaseUrl: "https://exchange.demo.taler.net",
});

export const Bitcoin = createExample(TestedComponent, {
  reservePub: "0ZSX8SH0M30KHX8K3Y1DAMVGDQV82XEF9DG1HC4QMQ3QWYT4AF00",
  paytoURI: parsePaytoUri(
    "payto://bitcoin/bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4?amount=BTC:0.1&subject=0ZSX8SH0M30KHX8K3Y1DAMVGDQV82XEF9DG1HC4QMQ3QWYT4AF00",
  ),
  amount: {
    currency: "BTC",
    value: 0,
    fraction: 14000000,
  },
  exchangeBaseUrl: "https://exchange.demo.taler.net",
});

export const BitcoinRegTest = createExample(TestedComponent, {
  reservePub: "0ZSX8SH0M30KHX8K3Y1DAMVGDQV82XEF9DG1HC4QMQ3QWYT4AF00",
  paytoURI: parsePaytoUri(
    "payto://bitcoin/bcrt1q6ps8qs6v8tkqrnru4xqqqa6rfwcx5ufpdfqht4?amount=BTC:0.1&subject=0ZSX8SH0M30KHX8K3Y1DAMVGDQV82XEF9DG1HC4QMQ3QWYT4AF00",
  ),
  amount: {
    currency: "BTC",
    value: 0,
    fraction: 14000000,
  },
  exchangeBaseUrl: "https://exchange.demo.taler.net",
});
export const BitcoinTest = createExample(TestedComponent, {
  reservePub: "0ZSX8SH0M30KHX8K3Y1DAMVGDQV82XEF9DG1HC4QMQ3QWYT4AF00",
  paytoURI: parsePaytoUri(
    "payto://bitcoin/tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx?amount=BTC:0.1&subject=0ZSX8SH0M30KHX8K3Y1DAMVGDQV82XEF9DG1HC4QMQ3QWYT4AF00",
  ),
  amount: {
    currency: "BTC",
    value: 0,
    fraction: 14000000,
  },
  exchangeBaseUrl: "https://exchange.demo.taler.net",
});
