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
import { Fragment, h, render, VNode } from "preact";
import { render as renderToString } from "preact-render-to-string";
import { useEffect } from "preact/hooks";
import { Footer } from "../components/Footer";
import "../css/pure-min.css";
import "../css/style.css";
import { QR } from "../components/QR";
import { Page, QRPlaceholder, WalletLink } from "../styled";

/**
 * This page creates a payment request QR code
 *
 * It will build into a mustache html template for server side rendering
 *
 * server side rendering params:
 *  - order_status_url
 *  - taler_pay_qrcode_svg
 *  - taler_pay_uri
 *  - order_summary
 *
 * request params:
 *  - pay_uri
 *  - order_summary
 *  - order_status_url
 */

interface Props {
  payURI?: string;
  order_status_url?: string;
  qr_code?: string;
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
        Payment requested for{" "}
        {order_summary ? order_summary : `{{ order_summary }}`}
      </title>
    </Fragment>
  );
}

export function RequestPayment({
  payURI,
  qr_code,
  order_status_url,
}: Props): VNode {
  useEffect(() => {
    const longpollDelayMs = 60 * 1000;
    let checkUrl: URL;
    try {
      checkUrl = new URL(
        order_status_url ? order_status_url : "{{& order_status_url }}"
      );
    } catch (e) {
      return;
    }
    checkUrl.searchParams.set("timeout_s", longpollDelayMs.toString());
    function check() {
      let retried = false;
      function retryOnce() {
        if (!retried) {
          retried = true;
          check();
        }
      }
      const req = new XMLHttpRequest();
      req.onreadystatechange = function () {
        if (req.readyState === XMLHttpRequest.DONE) {
          if (req.status === 200) {
            try {
              const resp = JSON.parse(req.responseText);
              if (resp.fulfillment_url) {
                window.location.replace(resp.fulfillment_url);
              }
            } catch (e) {
              console.error("could not parse response:", e);
            }
          }
          if (req.status === 202) {
            try {
              const resp = JSON.parse(req.responseText);
              if (resp.fulfillment_url) {
                window.location.replace(resp.fulfillment_url);
              }
            } catch (e) {
              console.error("could not parse response:", e);
            }
          }
          if (req.status === 402) {
            try {
              const resp = JSON.parse(req.responseText);
              if (resp.already_paid_order_id && resp.fulfillment_url) {
                window.location.replace(resp.fulfillment_url);
              }
            } catch (e) {
              console.error("could not parse response:", e);
            }
          }
          setTimeout(retryOnce, 500);
        }
      };
      req.onerror = function () {
        setTimeout(retryOnce, 500);
      };
      req.ontimeout = function () {
        setTimeout(retryOnce, 500);
      };
      req.timeout = longpollDelayMs;
      req.open("GET", checkUrl.href);
      req.send();
    }
    setTimeout(check, 500);
  });
  return (
    <Page>
      <section>
        <h1>Pay with Taler</h1>
        <p>Scan this QR code with your mobile wallet:</p>
        <QRPlaceholder
          dangerouslySetInnerHTML={{
            __html: qr_code ? qr_code : `{{{ taler_pay_qrcode_svg }}}`,
          }}
        />
        <p>
          <WalletLink href={payURI ? payURI : `{{ taler_pay_uri }}`}>
            Or open your Taller wallet
          </WalletLink>
        </p>
        <p>
          <a href="https://wallet.taler.net/">
            Don't have a Taler wallet yet? Install it!
          </a>
        </p>
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

    const uri = fromLocation.get("pay_uri") || undefined;
    const osu = fromLocation.get("order_status_url") || undefined;
    const qr_code = uri ? renderToString(<QR text={uri} />) : undefined;

    render(
      <RequestPayment payURI={uri} order_status_url={osu} qr_code={qr_code} />,
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
    body: renderToString(<RequestPayment />),
  };
}
