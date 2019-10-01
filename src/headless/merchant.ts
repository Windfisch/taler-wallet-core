/*
 This file is part of GNU Taler
 (C) 2019 GNUnet e.V.

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
 * Helpers for talking to the GNU Taler merchant backend.
 * Used mostly for integration tests.
 */

 /**
  * Imports.
  */
import axios from "axios";
import { CheckPaymentResponse } from "../talerTypes";
import URI = require("urijs");

/**
 * Connection to the *internal* merchant backend.
 */
export class MerchantBackendConnection {
  constructor(
    public merchantBaseUrl: string,
    public apiKey: string,
  ) {}

  async createOrder(
    amount: string,
    summary: string,
    fulfillmentUrl: string,
  ): Promise<{ orderId: string }> {
    const reqUrl = new URI("order").absoluteTo(this.merchantBaseUrl).href();
    const orderReq = {
      order: {
        amount,
        summary,
        fulfillment_url: fulfillmentUrl,
      },
    };
    const resp = await axios({
      method: "post",
      url: reqUrl,
      data: orderReq,
      responseType: "json",
      headers: {
        Authorization: `ApiKey ${this.apiKey}`,
      },
    });
    if (resp.status != 200) {
      throw Error("failed to create bank reserve");
    }
    const orderId = resp.data.order_id;
    if (!orderId) {
      throw Error("no order id in response");
    }
    return { orderId };
  }

  async checkPayment(orderId: string): Promise<CheckPaymentResponse> {
    const reqUrl = new URI("check-payment")
      .absoluteTo(this.merchantBaseUrl)
      .href();
    const resp = await axios({
      method: "get",
      url: reqUrl,
      params: { order_id: orderId },
      responseType: "json",
      headers: {
        Authorization: `ApiKey ${this.apiKey}`,
      },
    });
    if (resp.status != 200) {
      throw Error("failed to check payment");
    }
    return CheckPaymentResponse.checked(resp.data);
  }
}
