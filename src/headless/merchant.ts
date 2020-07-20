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
import {
  CheckPaymentResponse,
  codecForCheckPaymentResponse,
} from "../types/talerTypes";

/**
 * Connection to the *internal* merchant backend.
 */
export class MerchantBackendConnection {
  async refund(
    orderId: string,
    reason: string,
    refundAmount: string,
  ): Promise<string> {
    const reqUrl = new URL(`private/orders/${orderId}/refund`, this.merchantBaseUrl);
    const refundReq = {
      reason,
      refund: refundAmount,
    };
    const resp = await axios({
      method: "post",
      url: reqUrl.href,
      data: refundReq,
      responseType: "json",
      headers: {
        Authorization: `ApiKey ${this.apiKey}`,
      },
    });
    if (resp.status != 200) {
      throw Error("failed to do refund");
    }
    console.log("response", resp.data);
    const refundUri = resp.data.taler_refund_uri;
    if (!refundUri) {
      throw Error("no refund URI in response");
    }
    return refundUri;
  }

  constructor(public merchantBaseUrl: string, public apiKey: string) {}

  async authorizeTip(amount: string, justification: string): Promise<string> {
    const reqUrl = new URL("private/tips", this.merchantBaseUrl).href;
    const tipReq = {
      amount,
      justification,
      next_url: "about:blank",
    };
    const resp = await axios({
      method: "post",
      url: reqUrl,
      data: tipReq,
      responseType: "json",
      headers: {
        Authorization: `ApiKey ${this.apiKey}`,
      },
    });
    const tipUri = resp.data.taler_tip_uri;
    if (!tipUri) {
      throw Error("response does not contain tip URI");
    }
    return tipUri;
  }

  async createOrder(
    amount: string,
    summary: string,
    fulfillmentUrl: string,
  ): Promise<{ orderId: string }> {
    const t = Math.floor(new Date().getTime() / 1000) + 15 * 60;
    const reqUrl = new URL("private/orders", this.merchantBaseUrl).href;
    const orderReq = {
      order: {
        amount,
        summary,
        fulfillment_url: fulfillmentUrl,
        refund_deadline: { t_ms: t * 1000 },
        wire_transfer_deadline: { t_ms: t * 1000 },
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
    const reqUrl = new URL(`private/orders/${orderId}`, this.merchantBaseUrl).href;
    const resp = await axios({
      method: "get",
      url: reqUrl,
      responseType: "json",
      headers: {
        Authorization: `ApiKey ${this.apiKey}`,
      },
    });
    if (resp.status != 200) {
      throw Error("failed to check payment");
    }

    return codecForCheckPaymentResponse().decode(resp.data);
  }
}
