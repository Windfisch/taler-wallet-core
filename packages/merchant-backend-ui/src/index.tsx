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

import { h, VNode, Fragment } from 'preact';
import { BackendContextProvider } from './context/backend';
import { TranslationProvider } from './context/translation';
// import { Page as RequestPayment } from './RequestPayment';
import "./css/pure-min.css"
import { Route, Router } from 'preact-router';
import { Footer } from './components/Footer';
// import OfferTip from './pages/OfferTip';
// import {OfferRefund} from './pages/OfferRefund';
// import DepletedTip from './pages/DepletedTip';
// import RequestPayment from './pages/RequestPayment';
// import ShowOrderDetails from './pages/ShowOrderDetails';

export default function Application(): VNode {
  return (
    // <FetchContextProvider>
    <BackendContextProvider>
      <TranslationProvider>
        <ApplicationStatusRoutes />
      </TranslationProvider>
    </BackendContextProvider>
    // </FetchContextProvider>
  );
}

function ApplicationStatusRoutes(): VNode {
  return <Fragment>
    <Router>
      {/* <Route path="offer_tip" component={OfferTip} />
      <Route path="offer_refund" component={OfferRefund} />
      <Route path="depleted_tip" component={DepletedTip} />
      <Route path="request_payment" component={RequestPayment} />
      <Route path="show_order_details" component={ShowOrderDetails} /> */}
      <Route default component={() => <div>
        hello!
      </div>} />
    </Router>
    <Footer />
  </Fragment>
}
