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

import { addDays } from "date-fns";
import { h, VNode, FunctionalComponent } from "preact";
import { MerchantBackend } from "../../../../declaration";
import { DetailPage as TestedComponent } from "./DetailPage";

export default {
  title: "Pages/Order/Detail",
  component: TestedComponent,
  argTypes: {
    onRefund: { action: "onRefund" },
    onBack: { action: "onBack" },
  },
};

function createExample<Props>(
  Component: FunctionalComponent<Props>,
  props: Partial<Props>
) {
  const r = (args: any) => <Component {...args} />;
  r.args = props;
  return r;
}

const defaultContractTerm = {
  amount: "TESTKUDOS:10",
  timestamp: {
    t_s: new Date().getTime() / 1000,
  },
  auditors: [],
  exchanges: [],
  max_fee: "TESTKUDOS:1",
  max_wire_fee: "TESTKUDOS:1",
  merchant: {} as any,
  merchant_base_url: "http://merchant.url/",
  order_id: "2021.165-03GDFC26Y1NNG",
  products: [],
  summary: "text summary",
  wire_fee_amortization: 1,
  wire_transfer_deadline: {
    t_s: "never",
  },
  refund_deadline: { t_s: "never" },
  merchant_pub: "ASDASDASDSd",
  nonce: "QWEQWEQWE",
  pay_deadline: {
    t_s: "never",
  },
  wire_method: "x-taler-bank",
  h_wire: "asd",
} as MerchantBackend.ContractTerms;

// contract_terms: defaultContracTerm,
export const Claimed = createExample(TestedComponent, {
  id: "2021.165-03GDFC26Y1NNG",
  selected: {
    order_status: "claimed",
    contract_terms: defaultContractTerm,
  },
});

export const PaidNotRefundable = createExample(TestedComponent, {
  id: "2021.165-03GDFC26Y1NNG",
  selected: {
    order_status: "paid",
    contract_terms: defaultContractTerm,
    refunded: false,
    deposit_total: "TESTKUDOS:10",
    exchange_ec: 0,
    order_status_url: "http://merchant.backend/status",
    exchange_hc: 0,
    refund_amount: "TESTKUDOS:0",
    refund_details: [],
    refund_pending: false,
    wire_details: [],
    wire_reports: [],
    wired: false,
  },
});

export const PaidRefundable = createExample(TestedComponent, {
  id: "2021.165-03GDFC26Y1NNG",
  selected: {
    order_status: "paid",
    contract_terms: {
      ...defaultContractTerm,
      refund_deadline: {
        t_s: addDays(new Date(), 2).getTime() / 1000,
      },
    },
    refunded: false,
    deposit_total: "TESTKUDOS:10",
    exchange_ec: 0,
    order_status_url: "http://merchant.backend/status",
    exchange_hc: 0,
    refund_amount: "TESTKUDOS:0",
    refund_details: [],
    refund_pending: false,
    wire_details: [],
    wire_reports: [],
    wired: false,
  },
});

export const Unpaid = createExample(TestedComponent, {
  id: "2021.165-03GDFC26Y1NNG",
  selected: {
    order_status: "unpaid",
    order_status_url: "http://merchant.backend/status",
    creation_time: {
      t_s: new Date().getTime() / 1000,
    },
    summary: "text summary",
    taler_pay_uri: "pay uri",
    total_amount: "TESTKUDOS:10",
  },
});
