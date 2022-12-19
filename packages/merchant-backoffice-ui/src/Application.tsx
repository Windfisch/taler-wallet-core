/*
 This file is part of GNU Taler
 (C) 2021-2023 Taler Systems S.A.

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

import { h, VNode } from "preact";
import { route } from "preact-router";
import { useMemo } from "preact/hooks";
import { ApplicationReadyRoutes } from "./ApplicationReadyRoutes.js";
import { Loading } from "./components/exception/loading.js";
import {
  NotificationCard,
  NotYetReadyAppMenu,
} from "./components/menu/index.js";
import {
  BackendContextProvider,
  useBackendContext,
} from "./context/backend.js";
import { ConfigContextProvider } from "./context/config.js";
import { TranslationProvider } from "./context/translation.js";
import { useBackendConfig } from "./hooks/backend.js";
import { useTranslator } from "./i18n/index.js";
import LoginPage from "./paths/login/index.js";

export function Application(): VNode {
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
  const { updateLoginStatus, triedToLog } = useBackendContext();
  const result = useBackendConfig();
  const i18n = useTranslator();

  const updateLoginInfoAndGoToRoot = (url: string, token?: string) => {
    updateLoginStatus(url, token);
    route("/");
  };

  const { currency, version } = result.ok
    ? result.data
    : { currency: "unknown", version: "unknown" };
  const ctx = useMemo(() => ({ currency, version }), [currency, version]);

  if (!triedToLog) {
    return (
      <div id="app">
        <NotYetReadyAppMenu title="Welcome!" />
        <LoginPage onConfirm={updateLoginInfoAndGoToRoot} />
      </div>
    );
  }

  if (result.clientError && result.isUnauthorized)
    return (
      <div id="app">
        <NotYetReadyAppMenu title="Login" />
        <LoginPage onConfirm={updateLoginInfoAndGoToRoot} />
      </div>
    );

  if (result.clientError && result.isNotfound)
    return (
      <div id="app">
        <NotYetReadyAppMenu title="Error" />
        <NotificationCard
          notification={{
            message: i18n`Server not found`,
            type: "ERROR",
            description: `Check your url`,
          }}
        />
        <LoginPage onConfirm={updateLoginInfoAndGoToRoot} />
      </div>
    );

  if (result.serverError)
    return (
      <div id="app">
        <NotYetReadyAppMenu title="Error" />
        <NotificationCard
          notification={{
            message: i18n`Couldn't access the server`,
            type: "ERROR",
            description: i18n`Got message ${result.message} from ${result.info?.url}`,
          }}
        />
        <LoginPage onConfirm={updateLoginInfoAndGoToRoot} />
      </div>
    );

  if (result.loading) return <Loading />;

  if (!result.ok)
    return (
      <div id="app">
        <NotYetReadyAppMenu title="Error" />
        <NotificationCard
          notification={{
            message: i18n`Unexpected Error`,
            type: "ERROR",
            description: i18n`Got message ${result.message} from ${result.info?.url}`,
          }}
        />
        <LoginPage onConfirm={updateLoginInfoAndGoToRoot} />
      </div>
    );

  return (
    <div id="app" class="has-navbar-fixed-top">
      <ConfigContextProvider value={ctx}>
        <ApplicationReadyRoutes />
      </ConfigContextProvider>
    </div>
  );
}
