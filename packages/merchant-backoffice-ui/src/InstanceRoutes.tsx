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

import { Fragment, FunctionComponent, h, VNode } from "preact";
import { Route, route, Router } from "preact-router";
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import { Loading } from "./components/exception/loading";
import { Menu, NotificationCard } from "./components/menu";
import { useBackendContext } from "./context/backend";
import { InstanceContextProvider } from "./context/instance";
import {
  useBackendDefaultToken,
  useBackendInstanceToken,
  useLocalStorage,
} from "./hooks";
import { HttpError } from "./hooks/backend";
import { Translate, useTranslator } from "./i18n";
import InstanceCreatePage from "./paths/admin/create";
import InstanceListPage from "./paths/admin/list";
import OrderCreatePage from "./paths/instance/orders/create";
import OrderDetailsPage from "./paths/instance/orders/details";
import OrderListPage from "./paths/instance/orders/list";
import ProductCreatePage from "./paths/instance/products/create";
import ProductListPage from "./paths/instance/products/list";
import ProductUpdatePage from "./paths/instance/products/update";
import TransferListPage from "./paths/instance/transfers/list";
import TransferCreatePage from "./paths/instance/transfers/create";
import ReservesCreatePage from "./paths/instance/reserves/create";
import ReservesDetailsPage from "./paths/instance/reserves/details";
import ReservesListPage from "./paths/instance/reserves/list";
import ListKYCPage from "./paths/instance/kyc/list";
import InstanceUpdatePage, {
  Props as InstanceUpdatePageProps,
  AdminUpdate as InstanceAdminUpdatePage,
} from "./paths/instance/update";
import LoginPage from "./paths/login";
import NotFoundPage from "./paths/notfound";
import { Notification } from "./utils/types";
import { useInstanceKYCDetails } from "./hooks/instance";
import { format } from "date-fns";

export enum InstancePaths {
  // details = '/',
  error = "/error",
  update = "/update",

  product_list = "/products",
  product_update = "/product/:pid/update",
  product_new = "/product/new",

  order_list = "/orders",
  order_new = "/order/new",
  order_details = "/order/:oid/details",

  reserves_list = "/reserves",
  reserves_details = "/reserves/:rid/details",
  reserves_new = "/reserves/new",

  kyc = "/kyc",

  transfers_list = "/transfers",
  transfers_new = "/transfer/new",
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

export enum AdminPaths {
  list_instances = "/instances",
  new_instance = "/instance/new",
  update_instance = "/instance/:id/update",
}

export interface Props {
  id: string;
  admin?: boolean;
  setInstanceName: (s: string) => void;
}

export function InstanceRoutes({ id, admin, setInstanceName }: Props): VNode {
  const [_, updateDefaultToken] = useBackendDefaultToken();
  const [token, updateToken] = useBackendInstanceToken(id);
  const {
    updateLoginStatus: changeBackend,
    addTokenCleaner,
    clearAllTokens,
  } = useBackendContext();
  const cleaner = useCallback(() => {
    updateToken(undefined);
  }, [id]);
  const i18n = useTranslator();

  type GlobalNotifState = (Notification & { to: string }) | undefined;
  const [globalNotification, setGlobalNotification] =
    useState<GlobalNotifState>(undefined);

  useEffect(() => {
    addTokenCleaner(cleaner);
  }, [addTokenCleaner, cleaner]);

  const changeToken = (token?: string) => {
    if (admin) {
      updateToken(token);
    } else {
      updateDefaultToken(token);
    }
  };
  const updateLoginStatus = (url: string, token?: string) => {
    changeBackend(url);
    if (!token) return;
    changeToken(token);
  };

  const value = useMemo(
    () => ({ id, token, admin, changeToken }),
    [id, token, admin]
  );

  function ServerErrorRedirectTo(to: InstancePaths | AdminPaths) {
    return function ServerErrorRedirectToImpl(error: HttpError) {
      setGlobalNotification({
        message: i18n`The backend reported a problem: HTTP status #${error.status}`,
        description: i18n`Diagnostic from ${error.info?.url} is "${error.message}"`,
        details:
          error.clientError || error.serverError
            ? error.error?.detail
            : undefined,
        type: "ERROR",
        to,
      });
      return <Redirect to={to} />;
    };
  }

  const LoginPageAccessDenied = () => (
    <Fragment>
      <NotificationCard
        notification={{
          message: i18n`Access denied`,
          description: i18n`The access token provided is invalid.`,
          type: "ERROR",
        }}
      />
      <LoginPage onConfirm={updateLoginStatus} />
    </Fragment>
  );

  function IfAdminCreateDefaultOr<T>(Next: FunctionComponent<any>) {
    return function IfAdminCreateDefaultOrImpl(props?: T) {
      if (admin && id === "default") {
        return (
          <Fragment>
            <NotificationCard
              notification={{
                message: i18n`No 'default' instance configured yet.`,
                description: i18n`Create a 'default' instance to begin using the merchant backoffice.`,
                type: "INFO",
              }}
            />
            <InstanceCreatePage
              forceId="default"
              onConfirm={() => {
                route(AdminPaths.list_instances);
              }}
            />
          </Fragment>
        );
      }
      if (props) {
        return <Next {...props} />;
      }
      return <Next />;
    };
  }

  const clearTokenAndGoToRoot = () => {
    clearAllTokens();
    route("/");
  };

  return (
    <InstanceContextProvider value={value}>
      <Menu
        instance={id}
        admin={admin}
        onLogout={clearTokenAndGoToRoot}
        setInstanceName={setInstanceName}
      />
      <KycBanner />
      <NotificationCard notification={globalNotification} />

      <Router
        onChange={(e) => {
          const movingOutFromNotification =
            globalNotification && e.url !== globalNotification.to;
          if (movingOutFromNotification) {
            setGlobalNotification(undefined);
          }
        }}
      >
        <Route path="/" component={Redirect} to={InstancePaths.order_list} />

        {/**
         * Admin pages
         */}
        {admin && (
          <Route
            path={AdminPaths.list_instances}
            component={InstanceListPage}
            onCreate={() => {
              route(AdminPaths.new_instance);
            }}
            onUpdate={(id: string): void => {
              route(`/instance/${id}/update`);
            }}
            setInstanceName={setInstanceName}
            onUnauthorized={LoginPageAccessDenied}
            onLoadError={ServerErrorRedirectTo(InstancePaths.error)}
          />
        )}

        {admin && (
          <Route
            path={AdminPaths.new_instance}
            component={InstanceCreatePage}
            onBack={() => route(AdminPaths.list_instances)}
            onConfirm={() => {
              route(AdminPaths.list_instances);
            }}
          />
        )}

        {admin && (
          <Route
            path={AdminPaths.update_instance}
            component={AdminInstanceUpdatePage}
            onBack={() => route(AdminPaths.list_instances)}
            onConfirm={() => {
              route(AdminPaths.list_instances);
            }}
            onUpdateError={ServerErrorRedirectTo(AdminPaths.list_instances)}
            onLoadError={ServerErrorRedirectTo(AdminPaths.list_instances)}
            onNotFound={NotFoundPage}
          />
        )}

        {/**
         * Update instance page
         */}
        <Route
          path={InstancePaths.update}
          component={InstanceUpdatePage}
          onBack={() => {
            route(`/`);
          }}
          onConfirm={() => {
            route(`/`);
          }}
          onUpdateError={noop}
          onNotFound={IfAdminCreateDefaultOr(NotFoundPage)}
          onUnauthorized={LoginPageAccessDenied}
          onLoadError={ServerErrorRedirectTo(InstancePaths.error)}
        />

        {/**
         * Product pages
         */}
        <Route
          path={InstancePaths.product_list}
          component={ProductListPage}
          onUnauthorized={LoginPageAccessDenied}
          onLoadError={ServerErrorRedirectTo(InstancePaths.update)}
          onCreate={() => {
            route(InstancePaths.product_new);
          }}
          onSelect={(id: string) => {
            route(InstancePaths.product_update.replace(":pid", id));
          }}
          onNotFound={IfAdminCreateDefaultOr(NotFoundPage)}
        />
        <Route
          path={InstancePaths.product_update}
          component={ProductUpdatePage}
          onUnauthorized={LoginPageAccessDenied}
          onLoadError={ServerErrorRedirectTo(InstancePaths.product_list)}
          onConfirm={() => {
            route(InstancePaths.product_list);
          }}
          onBack={() => {
            route(InstancePaths.product_list);
          }}
          onNotFound={IfAdminCreateDefaultOr(NotFoundPage)}
        />
        <Route
          path={InstancePaths.product_new}
          component={ProductCreatePage}
          onConfirm={() => {
            route(InstancePaths.product_list);
          }}
          onBack={() => {
            route(InstancePaths.product_list);
          }}
        />

        {/**
         * Order pages
         */}
        <Route
          path={InstancePaths.order_list}
          component={OrderListPage}
          onCreate={() => {
            route(InstancePaths.order_new);
          }}
          onSelect={(id: string) => {
            route(InstancePaths.order_details.replace(":oid", id));
          }}
          onUnauthorized={LoginPageAccessDenied}
          onLoadError={ServerErrorRedirectTo(InstancePaths.update)}
          onNotFound={IfAdminCreateDefaultOr(NotFoundPage)}
        />
        <Route
          path={InstancePaths.order_details}
          component={OrderDetailsPage}
          onUnauthorized={LoginPageAccessDenied}
          onLoadError={ServerErrorRedirectTo(InstancePaths.order_list)}
          onNotFound={IfAdminCreateDefaultOr(NotFoundPage)}
          onBack={() => {
            route(InstancePaths.order_list);
          }}
        />
        <Route
          path={InstancePaths.order_new}
          component={OrderCreatePage}
          onConfirm={() => {
            route(InstancePaths.order_list);
          }}
          onBack={() => {
            route(InstancePaths.order_list);
          }}
        />

        {/**
         * Transfer pages
         */}
        <Route
          path={InstancePaths.transfers_list}
          component={TransferListPage}
          onUnauthorized={LoginPageAccessDenied}
          onNotFound={IfAdminCreateDefaultOr(NotFoundPage)}
          onLoadError={ServerErrorRedirectTo(InstancePaths.update)}
          onCreate={() => {
            route(InstancePaths.transfers_new);
          }}
        />

        <Route
          path={InstancePaths.transfers_new}
          component={TransferCreatePage}
          onConfirm={() => {
            route(InstancePaths.transfers_list);
          }}
          onBack={() => {
            route(InstancePaths.transfers_list);
          }}
        />

        {/**
         * reserves pages
         */}
        <Route
          path={InstancePaths.reserves_list}
          component={ReservesListPage}
          onUnauthorized={LoginPageAccessDenied}
          onNotFound={IfAdminCreateDefaultOr(NotFoundPage)}
          onLoadError={ServerErrorRedirectTo(InstancePaths.update)}
          onSelect={(id: string) => {
            route(InstancePaths.reserves_details.replace(":rid", id));
          }}
          onCreate={() => {
            route(InstancePaths.reserves_new);
          }}
        />

        <Route
          path={InstancePaths.reserves_details}
          component={ReservesDetailsPage}
          onUnauthorized={LoginPageAccessDenied}
          onLoadError={ServerErrorRedirectTo(InstancePaths.reserves_list)}
          onNotFound={IfAdminCreateDefaultOr(NotFoundPage)}
          onBack={() => {
            route(InstancePaths.reserves_list);
          }}
        />

        <Route
          path={InstancePaths.reserves_new}
          component={ReservesCreatePage}
          onConfirm={() => {
            route(InstancePaths.reserves_list);
          }}
          onBack={() => {
            route(InstancePaths.reserves_list);
          }}
        />

        <Route path={InstancePaths.kyc} component={ListKYCPage} />
        {/**
         * Example pages
         */}
        <Route path="/loading" component={Loading} />
        <Route default component={NotFoundPage} />
      </Router>
    </InstanceContextProvider>
  );
}

export function Redirect({ to }: { to: string }): null {
  useEffect(() => {
    route(to, true);
  });
  return null;
}

function AdminInstanceUpdatePage({
  id,
  ...rest
}: { id: string } & InstanceUpdatePageProps) {
  const [token, changeToken] = useBackendInstanceToken(id);
  const { updateLoginStatus: changeBackend } = useBackendContext();
  const updateLoginStatus = (url: string, token?: string) => {
    changeBackend(url);
    if (token) changeToken(token);
  };
  const value = useMemo(
    () => ({ id, token, admin: true, changeToken }),
    [id, token]
  );
  const i18n = useTranslator();

  return (
    <InstanceContextProvider value={value}>
      <InstanceAdminUpdatePage
        {...rest}
        instanceId={id}
        onLoadError={(error: HttpError) => {
          return (
            <Fragment>
              <NotificationCard
                notification={{
                  message: i18n`The backend reported a problem: HTTP status #${error.status}`,
                  description: i18n`Diagnostic from ${error.info?.url} is "${error.message}"`,
                  details:
                    error.clientError || error.serverError
                      ? error.error?.detail
                      : undefined,
                  type: "ERROR",
                }}
              />
              <LoginPage onConfirm={updateLoginStatus} />
            </Fragment>
          );
        }}
        onUnauthorized={() => {
          return (
            <Fragment>
              <NotificationCard
                notification={{
                  message: i18n`Access denied`,
                  description: i18n`The access token provided is invalid`,
                  type: "ERROR",
                }}
              />
              <LoginPage onConfirm={updateLoginStatus} />
            </Fragment>
          );
        }}
      />
    </InstanceContextProvider>
  );
}

function KycBanner(): VNode {
  const kycStatus = useInstanceKYCDetails();
  const today = format(new Date(), "yyyy-MM-dd");
  const [lastHide, setLastHide] = useLocalStorage("kyc-last-hide");
  const hasBeenHidden = today === lastHide;
  const needsToBeShown = kycStatus.ok && kycStatus.data.type === "redirect";
  if (hasBeenHidden || !needsToBeShown) return <Fragment />;
  return (
    <NotificationCard
      notification={{
        type: "WARN",
        message: "KYC verification needed",
        description: (
          <div>
            <p>
              Some transfer are on hold until a KYC process is completed. Go to
              the KYC section in the left panel for more information
            </p>
            <div class="buttons is-right">
              <button class="button" onClick={() => setLastHide(today)}>
                <Translate>Hide for today</Translate>
              </button>
            </div>
          </div>
        ),
      }}
    />
  );
}
