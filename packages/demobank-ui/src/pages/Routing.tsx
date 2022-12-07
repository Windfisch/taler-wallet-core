import { createHashHistory } from "history";
import { h, VNode } from "preact";
import Router, { route, Route } from "preact-router";
import { useEffect } from "preact/hooks";
import {
  AccountPage,
  PublicHistoriesPage,
  RegistrationPage,
} from "./home/index.js";

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
