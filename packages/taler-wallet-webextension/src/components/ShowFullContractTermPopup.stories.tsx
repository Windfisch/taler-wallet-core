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

import { WalletContractData } from "@gnu-taler/taler-wallet-core";
import { createExample } from "../test-utils.js";
import {
  ErrorView,
  HiddenView,
  LoadingView,
  ShowView,
} from "./ShowFullContractTermPopup.js";

export default {
  title: "component/ShowFullContractTermPopup",
};

const cd: WalletContractData = {
  amount: {
    currency: "ARS",
    fraction: 0,
    value: 2,
  },
  contractTermsHash:
    "92X0KSJPZ8XS2XECCGFWTCGW8XMFCXTT2S6WHZDP6H9Y3TSKMTHY94WXEWDERTNN5XWCYGW4VN5CF2D4846HXTW7P06J4CZMHCWKC9G",
  fulfillmentUrl: "",
  merchantBaseUrl: "https://merchant-backend.taler.ar/",
  merchantPub: "JZYHJ13M91GMSQMT75J8Q6ZN0QP8XF8CRHR7K5MMWYE8JQB6AAPG",
  merchantSig:
    "0YA1WETV15R6K8QKS79QA3QMT16010F42Q49VSKYQ71HVQKAG0A4ZJCA4YTKHE9EA5SP156TJSKZEJJJ87305N6PS80PC48RNKYZE08",
  orderId: "2022.220-0281XKKB8W7YE",
  summary: "w",
  maxWireFee: {
    currency: "ARS",
    fraction: 0,
    value: 1,
  },
  payDeadline: {
    t_s: 1660002673,
  },
  refundDeadline: {
    t_s: 1660002673,
  },
  wireFeeAmortization: 1,
  allowedAuditors: [
    {
      auditorBaseUrl: "https://auditor.taler.ar/",
      auditorPub: "0000000000000000000000000000000000000000000000000000",
    },
  ],
  allowedExchanges: [
    {
      exchangeBaseUrl: "https://exchange.taler.ar/",
      exchangePub: "1C2EYE90PYDNVRTQ25A3PA0KW5W4WPAJNNQHVHV49PT6W5CERFV0",
    },
  ],
  timestamp: {
    t_s: 1659972710,
  },
  wireMethod: "x-taler-bank",
  wireInfoHash:
    "QDT28374ZHYJ59WQFZ3TW1D5WKJVDYHQT86VHED3TNMB15ANJSKXDYPPNX01348KDYCX6T4WXA5A8FJJ8YWNEB1JW726C1JPKHM89DR",
  maxDepositFee: {
    currency: "ARS",
    fraction: 0,
    value: 1,
  },
  merchant: {
    name: "Default",
    address: {
      country: "ar",
    },
    jurisdiction: {
      country: "ar",
    },
  },
  products: [],
  autoRefund: undefined,
  summaryI18n: undefined,
  deliveryDate: undefined,
  deliveryLocation: undefined,
};

export const ShowingSimpleOrder = createExample(ShowView, {
  contractTerms: cd,
});
export const Error = createExample(ErrorView, {
  proposalId: "asd",
  error: {
    hasError: true,
    message: "message",
    operational: false,
    // details: {
    //   code: 123,
    // },
  },
});
export const Loading = createExample(LoadingView, {});
export const Hidden = createExample(HiddenView, {});
