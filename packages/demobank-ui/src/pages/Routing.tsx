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

import { createHashHistory } from "history";
import { h, VNode } from "preact";
import Router, { route, Route } from "preact-router";
import { useEffect } from "preact/hooks";
import { AccountPage } from "./home/AccountPage.js";
import { PublicHistoriesPage } from "./home/PublicHistoriesPage.js";
import { RegistrationPage } from "./home/RegistrationPage.js";

export function Routing(): VNode {
  const history = createHashHistory();
  return (
    <Router history={history}>
      <Route path="/public-accounts" component={PublicHistoriesPage} />
      <Route path="/register" component={RegistrationPage} />
      <Route path="/account/:id*" component={AccountPage} />
      <Route default component={Redirect} to="/account" />
    </Router>
  );
}

function Redirect({ to }: { to: string }): VNode {
  useEffect(() => {
    route(to, true);
  }, []);
  return <div>being redirected to {to}</div>;
}
