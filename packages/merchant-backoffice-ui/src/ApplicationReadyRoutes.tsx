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
import { Fragment, h, VNode } from "preact";
import Router, { Route, route } from "preact-router";
import { useBackendContext } from "./context/backend.js";
import { useBackendInstancesTestForAdmin } from "./hooks/backend.js";
import { InstanceRoutes } from "./InstanceRoutes.js";
import LoginPage from "./paths/login/index.js";
import { INSTANCE_ID_LOOKUP } from "./utils/constants.js";
import { NotYetReadyAppMenu, NotificationCard } from "./components/menu/index.js";
import { useTranslator } from "./i18n/index.js";
import { createHashHistory } from "history";
import { useState } from "preact/hooks";

export function ApplicationReadyRoutes(): VNode {
  const i18n = useTranslator();
  const {
    url: backendURL,
    updateLoginStatus,
    clearAllTokens,
  } = useBackendContext();

  const result = useBackendInstancesTestForAdmin();

  const clearTokenAndGoToRoot = () => {
    clearAllTokens();
    route("/");
  };

  if (result.clientError && result.isUnauthorized) {
    return (
      <Fragment>
        <NotYetReadyAppMenu title="Login" onLogout={clearTokenAndGoToRoot} />
        <NotificationCard
          notification={{
            message: i18n`Access denied`,
            description: i18n`Check your token is valid`,
            type: "ERROR",
          }}
        />
        <LoginPage onConfirm={updateLoginStatus} />
      </Fragment>
    );
  }

  if (result.loading) return <NotYetReadyAppMenu title="Loading..." />;

  let admin = true;
  let instanceNameByBackendURL;

  if (!result.ok) {
    const path = new URL(backendURL).pathname;
    const match = INSTANCE_ID_LOOKUP.exec(path);
    if (!match || !match[1]) {
      // this should be rare because
      // query to /config is ok but the URL
      // does not match our pattern
      return (
        <Fragment>
          <NotYetReadyAppMenu title="Error" onLogout={clearTokenAndGoToRoot} />
          <NotificationCard
            notification={{
              message: i18n`Couldn't access the server.`,
              description: i18n`Could not infer instance id from url ${backendURL}`,
              type: "ERROR",
            }}
          />
          <LoginPage onConfirm={updateLoginStatus} />
        </Fragment>
      );
    }

    admin = false;
    instanceNameByBackendURL = match[1];
  }

  const history = createHashHistory();
  return (
    <Router history={history}>
      <Route
        default
        component={DefaultMainRoute}
        admin={admin}
        instanceNameByBackendURL={instanceNameByBackendURL}
      />
    </Router>
  );
}

function DefaultMainRoute({ instance, admin, instanceNameByBackendURL }: any) {
  const [instanceName, setInstanceName] = useState(
    instanceNameByBackendURL || instance || "default"
  );

  return (
    <InstanceRoutes
      admin={admin}
      id={instanceName}
      setInstanceName={setInstanceName}
    />
  );
}
