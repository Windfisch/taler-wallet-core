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
import { Fragment, h, render, VNode } from 'preact';
import { render as renderToString } from 'preact-render-to-string';
import { useEffect } from 'preact/hooks';
import { Footer } from '../components/Footer';
import { QR } from '../components/QR';
import "../css/pure-min.css";
import "../css/style.css";
import { Page, QRPlaceholder, WalletLink } from '../styled';
import { ShowOrderDetails } from './ShowOrderDetails';


/**
 * This page creates a tip offer QR code
 * 
 * It will build into a mustache html template for server side rendering
 * 
 * server side rendering params:
 *  - tip_status_url
 *  - taler_tip_qrcode_svg
 *  - taler_tip_uri
 * 
 * request params:
 *  - tip_uri
 *  - tip_status_url
 */

interface Props {
  tipURI?: string,
  tip_status_url?: string,
  qr_code?: string,
}

export function Head(): VNode {
  return <Fragment>
    <meta charSet="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <noscript>
      <meta http-equiv="refresh" content="1" />
    </noscript>
    <title>Tip available</title>
  </Fragment>
}

export function OfferTip({ tipURI, qr_code, tip_status_url }: Props): VNode {
  useEffect(() => {
    let checkUrl: URL;
    try {
      checkUrl = new URL(tip_status_url ? tip_status_url : "{{& tip_status_url }}");
    } catch (e) {
      return;
    }

    const delayMs = 500;
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
          if (req.status === 410) {
            window.location.reload();
          }
          setTimeout(retryOnce, delayMs);
        }
      };
      req.onerror = function () {
        setTimeout(retryOnce, delayMs);
      }
      req.open("GET", checkUrl.href);
      req.send();
    }

    setTimeout(check, delayMs);
  })
  return <Page>
    <section>
      <h1 >Collect Taler tip</h1>
      <p>
        Scan this QR code with your Taler mobile wallet:
      </p>
      <QRPlaceholder dangerouslySetInnerHTML={{ __html: qr_code ? qr_code : `{{{ taler_tip_qrcode_svg }}}` }} />
      <p>
        <WalletLink href={tipURI ? tipURI : `{{ taler_tip_uri }}`}>
          Or open your Taller wallet
        </WalletLink>
      </p>
      <p>
        <a href="https://wallet.taler.net/">Don't have a Taler wallet yet? Install it!</a>
      </p>
    </section>
    <Footer />
  </Page>
}

export function mount(): void {
  try {
    const fromLocation = new URL(window.location.href).searchParams

    const uri = fromLocation.get('tip_uri') || undefined
    const tsu = fromLocation.get('tip_status_url') || undefined

    render(<OfferTip tipURI={uri} tip_status_url={tsu} />, document.body);
  } catch (e) {
    console.error("got error", e);
    if (e instanceof Error) {
      document.body.innerText = `Fatal error: "${e.message}".  Please report this bug at https://bugs.gnunet.org/.`;
    }
  }
}

export function buildTimeRendering(): { head: string, body: string } {
  return {
    head: renderToString(<Head />),
    body: renderToString(<ShowOrderDetails />)
  }
}
