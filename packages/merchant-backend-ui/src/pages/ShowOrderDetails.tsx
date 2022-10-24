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
import { format, formatDuration } from "date-fns";
import { intervalToDuration } from "date-fns/esm";
import { Fragment, h, render, VNode } from "preact";
import { render as renderToString } from "preact-render-to-string";
import { Footer } from "../components/Footer";
import "../css/pure-min.css";
import "../css/style.css";
import { MerchantBackend } from "../declaration";
import { Page, InfoBox, TableExpanded, TableSimple } from "../styled";

/**
 * This page creates a payment request QR code
 *
 * It will build into a mustache html template for server side rendering
 *
 * server side rendering params:
 *  - order_summary
 *  - contract_terms
 *  - refund_amount
 *
 * request params:
 *  - refund_amount
 *  - contract_terms
 *  - order_summary
 */

export interface Props {
  btr?: boolean; // build time rendering flag
  order_summary?: string;
  refund_amount?: string;
  contract_terms?: MerchantBackend.ContractTerms;
}

function Head({ order_summary }: { order_summary?: string }): VNode {
  return (
    <Fragment>
      <meta charSet="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <noscript>
        <meta http-equiv="refresh" content="1" />
      </noscript>
      <title>
        Status of your order for{" "}
        {order_summary ? order_summary : `{{ order_summary }}`}
      </title>
      <script>{`
      var contractTermsStr = '{{{contract_terms_json}}}';
    `}</script>
    </Fragment>
  );
}

function Location({
  templateName,
  location,
  btr,
}: {
  templateName: string;
  location: MerchantBackend.Location | undefined;
  btr?: boolean;
}) {
  //FIXME: mustache strings show be constructed in a way that ends in the final output of the html but is not present in the
  // javascript code, otherwise when mustache render engine run over the html it will also replace string in the javascript code
  // that is made to run when the browser has javascript enable leading into undefined behavior.
  // that's why in the next fields we are using concatenations to build the mustache placeholder.
  return (
    <Fragment>
      {btr && `{{` + `#${templateName}.building_name}}`}
      <dd>
        {location?.building_name ||
          (btr && `{{ ${templateName}.building_name }}`)}{" "}
        {location?.building_number ||
          (btr && `{{ ${templateName}.building_number }}`)}
      </dd>
      {btr && `{{` + `/${templateName}.building_name}}`}

      {btr && `{{` + `#${templateName}.country}}`}
      <dd>
        {location?.country || (btr && `{{ ${templateName}.country }}`)}{" "}
        {location?.country_subdivision ||
          (btr && `{{ ${templateName}.country_subdivision }}`)}
      </dd>
      {btr && `{{` + `/${templateName}.country}}`}

      {btr && `{{` + `#${templateName}.district}}`}
      <dd>{location?.district || (btr && `{{ ${templateName}.district }}`)}</dd>
      {btr && `{{` + `/${templateName}.district}}`}

      {btr && `{{` + `#${templateName}.post_code}}`}
      <dd>
        {location?.post_code || (btr && `{{ ${templateName}.post_code }}`)}
      </dd>
      {btr && `{{` + `/${templateName}.post_code}}`}

      {btr && `{{` + `#${templateName}.street}}`}
      <dd>{location?.street || (btr && `{{ ${templateName}.street }}`)}</dd>
      {btr && `{{` + `/${templateName}.street}}`}

      {btr && `{{` + `#${templateName}.town}}`}
      <dd>{location?.town || (btr && `{{ ${templateName}.town }}`)}</dd>
      {btr && `{{` + `/${templateName}.town}}`}

      {btr && `{{` + `#${templateName}.town_location}}`}
      <dd>
        {location?.town_location ||
          (btr && `{{ ${templateName}.town_location }}`)}
      </dd>
      {btr && `{{` + `/${templateName}.town_location}}`}
    </Fragment>
  );
}

export function ShowOrderDetails({
  order_summary,
  refund_amount,
  contract_terms,
  btr,
}: Props): VNode {
  const productList = btr
    ? [{} as MerchantBackend.Product]
    : contract_terms?.products || [];
  const auditorsList = btr
    ? [{} as MerchantBackend.Auditor]
    : contract_terms?.auditors || [];
  const exchangesList = btr
    ? [{} as MerchantBackend.Exchange]
    : contract_terms?.exchanges || [];
  const hasDeliveryInfo =
    btr ||
    !!contract_terms?.delivery_date ||
    !!contract_terms?.delivery_location;

  return (
    <Page>
      <header>
        <h1>
          Details of order{" "}
          {contract_terms?.order_id || `{{ contract_terms.order_id }}`}
        </h1>
      </header>

      <section>
        {btr && `{{#refund_amount}}`}
        {(btr || refund_amount) && (
          <section>
            <InfoBox>
              <b>Refunded:</b> The merchant refunded you{" "}
              <b>{refund_amount || `{{ refund_amount }}`}</b>.
            </InfoBox>
          </section>
        )}
        {btr && `{{/refund_amount}}`}

        <section>
          <TableExpanded>
            <dt>Order summary:</dt>
            <dd>{contract_terms?.summary || `{{ contract_terms.summary }}`}</dd>
            <dt>Amount paid:</dt>
            <dd>{contract_terms?.amount || `{{ contract_terms.amount }}`}</dd>
            <dt>Order date:</dt>
            <dd>
              {contract_terms?.timestamp
                ? contract_terms?.timestamp.t_s != "never"
                  ? format(
                      contract_terms?.timestamp.t_s,
                      "dd MMM yyyy HH:mm:ss"
                    )
                  : "never"
                : `{{ contract_terms.timestamp_str }}`}{" "}
            </dd>
            <dt>Merchant name:</dt>
            <dd>
              {contract_terms?.merchant.name ||
                `{{ contract_terms.merchant.name }}`}
            </dd>
          </TableExpanded>
        </section>

        {btr && `{{#contract_terms.hasProducts}}`}
        {!productList.length ? null : (
          <section>
            <h2>Products purchased</h2>
            <TableSimple>
              {btr && "{{" + "#contract_terms.products" + "}}"}
              {productList.map((p, i) => {
                const taxList = btr
                  ? [{} as MerchantBackend.Tax]
                  : p.taxes || [];

                return (
                  <Fragment key={i}>
                    <p>{p.description || `{{description}}`}</p>
                    <dl>
                      <dt>Quantity:</dt>
                      <dd>{p.quantity || `{{quantity}}`}</dd>

                      <dt>Price:</dt>
                      <dd>{p.price || `{{price}}`}</dd>

                      {btr && `{{#hasTaxes}}`}
                      {!taxList.length ? null : (
                        <Fragment>
                          {btr && "{{" + "#taxes" + "}}"}
                          {taxList.map((t, i) => {
                            return (
                              <Fragment key={i}>
                                <dt>{t.name || `{{name}}`}</dt>
                                <dd>{t.tax || `{{tax}}`}</dd>
                              </Fragment>
                            );
                          })}
                          {btr && "{{" + "/taxes" + "}}"}
                        </Fragment>
                      )}
                      {btr && `{{/hasTaxes}}`}

                      {btr && `{{#delivery_date}}`}
                      {(btr || p.delivery_date) && (
                        <Fragment>
                          <dt>Delivered on:</dt>
                          <dd>
                            {p.delivery_date
                              ? p.delivery_date.t_s != "never"
                                ? format(
                                    p.delivery_date.t_s,
                                    "dd MMM yyyy HH:mm:ss"
                                  )
                                : "never"
                              : `{{ delivery_date_str }}`}{" "}
                          </dd>
                        </Fragment>
                      )}
                      {btr && `{{/delivery_date}}`}

                      {btr && `{{#unit}}`}
                      {(btr || p.unit) && (
                        <Fragment>
                          <dt>Product unit:</dt>
                          <dd>{p.unit || `{{.}}`}</dd>
                        </Fragment>
                      )}
                      {btr && `{{/unit}}`}

                      {btr && `{{#product_id}}`}
                      {(btr || p.product_id) && (
                        <Fragment>
                          <dt>Product ID:</dt>
                          <dd>{p.product_id || `{{.}}`}</dd>
                        </Fragment>
                      )}
                      {btr && `{{/product_id}}`}
                    </dl>
                  </Fragment>
                );
              })}
              {btr && "{{" + "/contract_terms.products" + "}}"}
            </TableSimple>
          </section>
        )}
        {btr && `{{/contract_terms.hasProducts}}`}

        {btr && `{{#contract_terms.has_delivery_info}}`}
        {!hasDeliveryInfo ? null : (
          <section>
            <h2>Delivery information</h2>
            <TableExpanded>
              {btr && `{{#contract_terms.delivery_date}}`}
              {(btr || contract_terms?.delivery_date) && (
                <Fragment>
                  <dt>Delivery date:</dt>
                  <dd>
                    {contract_terms?.delivery_date
                      ? contract_terms?.delivery_date.t_s != "never"
                        ? format(
                            contract_terms?.delivery_date.t_s,
                            "dd MMM yyyy HH:mm:ss"
                          )
                        : "never"
                      : `{{ contract_terms.delivery_date_str }}`}{" "}
                  </dd>
                </Fragment>
              )}
              {btr && `{{/contract_terms.delivery_date}}`}

              {btr && `{{#contract_terms.delivery_location}}`}
              {(btr || contract_terms?.delivery_location) && (
                <Fragment>
                  <dt>Delivery address:</dt>
                  <Location
                    btr={btr}
                    location={contract_terms?.delivery_location}
                    templateName="contract_terms.delivery_location"
                  />
                </Fragment>
              )}
              {btr && `{{/contract_terms.delivery_location}}`}
            </TableExpanded>
          </section>
        )}
        {btr && `{{/contract_terms.has_delivery_info}}`}

        <section>
          <h2>Full payment information</h2>
          <TableExpanded>
            <dt>Amount paid:</dt>
            <dd>{contract_terms?.amount || `{{ contract_terms.amount }}`}</dd>
            <dt>Wire transfer method:</dt>
            <dd>
              {contract_terms?.wire_method ||
                `{{ contract_terms.wire_method }}`}
            </dd>
            <dt>Payment deadline:</dt>
            <dd>
              {contract_terms?.pay_deadline
                ? contract_terms?.pay_deadline.t_s != "never"
                  ? format(
                      contract_terms?.pay_deadline.t_s,
                      "dd MMM yyyy HH:mm:ss"
                    )
                  : "never"
                : `{{ contract_terms.pay_deadline_str }}`}{" "}
            </dd>
            <dt>Exchange transfer deadline:</dt>
            <dd>
              {contract_terms?.wire_transfer_deadline
                ? contract_terms?.wire_transfer_deadline.t_s != "never"
                  ? format(
                      contract_terms?.wire_transfer_deadline.t_s,
                      "dd MMM yyyy HH:mm:ss"
                    )
                  : "never"
                : `{{ contract_terms.wire_transfer_deadline_str }}`}{" "}
            </dd>
            <dt>Maximum deposit fee:</dt>
            <dd>{contract_terms?.max_fee || `{{ contract_terms.max_fee }}`}</dd>
            <dt>Maximum wire fee:</dt>
            <dd>
              {contract_terms?.max_wire_fee ||
                `{{ contract_terms.max_wire_fee }}`}
            </dd>
            <dt>Wire fee amortization:</dt>
            <dd>
              {contract_terms?.wire_fee_amortization ||
                `{{ contract_terms.wire_fee_amortization }}`}{" "}
              transactions
            </dd>
          </TableExpanded>
        </section>

        <section>
          <h2>Refund information</h2>
          <TableExpanded>
            <dt>Refund deadline:</dt>
            <dd>
              {contract_terms?.refund_deadline
                ? contract_terms?.refund_deadline.t_s != "never"
                  ? format(
                      contract_terms?.refund_deadline.t_s,
                      "dd MMM yyyy HH:mm:ss"
                    )
                  : "never"
                : `{{ contract_terms.refund_deadline_str }}`}{" "}
            </dd>

            {btr && `{{#contract_terms.auto_refund}}`}
            {(btr || contract_terms?.auto_refund) && (
              <Fragment>
                <dt>Attempt autorefund for:</dt>
                <dd>
                  {contract_terms?.auto_refund
                    ? contract_terms?.auto_refund.d_us != "forever"
                      ? formatDuration(
                          intervalToDuration({
                            start: 0,
                            end: contract_terms?.auto_refund.d_us,
                          })
                        )
                      : "forever"
                    : `{{ contract_terms.auto_refund_str }}`}{" "}
                </dd>
              </Fragment>
            )}
            {btr && `{{/contract_terms.auto_refund}}`}
          </TableExpanded>
        </section>

        <section>
          <h2>Additional order details</h2>
          <TableExpanded>
            <dt>Public reorder URL:</dt>
            <dd> -- not defined yet -- </dd>
            {btr && `{{#contract_terms.fulfillment_url}}`}
            {(btr || contract_terms?.fulfillment_url) && (
              <Fragment>
                <dt>Fulfillment URL:</dt>
                <dd>
                  {contract_terms?.fulfillment_url ||
                    (btr && `{{ contract_terms.fulfillment_url }}`)}
                </dd>
              </Fragment>
            )}
            {btr && `{{/contract_terms.fulfillment_url}}`}
            {/* <dt>Fulfillment message:</dt>
          <dd> -- not defined yet -- </dd> */}
          </TableExpanded>
        </section>

        <section>
          <h2>Full merchant information</h2>
          <TableExpanded>
            <dt>Merchant name:</dt>
            <dd>
              {contract_terms?.merchant.name ||
                `{{ contract_terms.merchant.name }}`}
            </dd>
            <dt>Merchant address:</dt>
            <Location
              btr={btr}
              location={contract_terms?.merchant.address}
              templateName="contract_terms.merchant.address"
            />
            <dt>Merchant's jurisdiction:</dt>
            <Location
              btr={btr}
              location={contract_terms?.merchant.jurisdiction}
              templateName="contract_terms.merchant.jurisdiction"
            />
            <dt>Merchant URI:</dt>
            <dd>
              {contract_terms?.merchant_base_url ||
                `{{ contract_terms.merchant_base_url }}`}
            </dd>
            <dt>Merchant's public key:</dt>
            <dd>
              {contract_terms?.merchant_pub ||
                `{{ contract_terms.merchant_pub }}`}
            </dd>
            {/* <dt>Merchant's hash:</dt>
          <dd> -- not defined yet -- </dd> */}
          </TableExpanded>
        </section>

        {btr && `{{#contract_terms.hasAuditors}}`}
        {!auditorsList.length ? null : (
          <section>
            <h2>Auditors accepted by the merchant</h2>
            <TableExpanded>
              {btr && "{{" + "#contract_terms.auditors" + "}}"}
              {auditorsList.map((p, i) => {
                return (
                  <Fragment key={i}>
                    <p>{p.name || `{{name}}`}</p>
                    <dt>Auditor's public key:</dt>
                    <dd>{p.auditor_pub || `{{auditor_pub}}`}</dd>
                    <dt>Auditor's URL:</dt>
                    <dd>{p.url || `{{url}}`}</dd>
                  </Fragment>
                );
              })}
              {btr && "{{" + "/contract_terms.auditors" + "}}"}
            </TableExpanded>
          </section>
        )}
        {btr && `{{/contract_terms.hasAuditors}}`}

        {btr && `{{#contract_terms.hasExchanges}}`}
        {!exchangesList.length ? null : (
          <section>
            <h2>Exchanges accepted by the merchant</h2>
            <TableExpanded>
              {btr && "{{" + "#contract_terms.exchanges" + "}}"}
              {exchangesList.map((p, i) => {
                return (
                  <Fragment key={i}>
                    <dt>Exchange's URL:</dt>
                    <dd>{p.url || `{{url}}`}</dd>
                    <dt>Public key:</dt>
                    <dd>{p.master_pub || `{{master_pub}}`}</dd>
                  </Fragment>
                );
              })}
              {btr && "{{" + "/contract_terms.exchanges" + "}}"}
            </TableExpanded>
          </section>
        )}
        {btr && `{{/contract_terms.hasExchanges}}`}
      </section>

      <Footer />
    </Page>
  );
}

export function mount(): void {
  try {
    const fromLocation = new URL(window.location.href).searchParams;
    const os = fromLocation.get("order_summary") || undefined;
    if (os) {
      render(<Head order_summary={os} />, document.head);
    }

    const ra = fromLocation.get("refund_amount") || undefined;
    const ct = fromLocation.get("contract_terms") || undefined;

    let contractTerms: MerchantBackend.ContractTerms | undefined;
    try {
      contractTerms = JSON.parse((window as any).contractTermsStr);
    } catch {}

    render(
      <ShowOrderDetails
        contract_terms={contractTerms}
        order_summary={os}
        refund_amount={ra}
      />,
      document.body
    );
  } catch (e) {
    console.error("got error", e);
    if (e instanceof Error) {
      document.body.innerText = `Fatal error: "${e.message}".  Please report this bug at https://bugs.gnunet.org/.`;
    }
  }
}

export function buildTimeRendering(): { head: string; body: string } {
  return {
    head: renderToString(<Head />),
    body: renderToString(<ShowOrderDetails btr />),
  };
}
