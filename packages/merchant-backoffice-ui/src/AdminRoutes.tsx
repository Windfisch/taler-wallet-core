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
import { h, VNode } from "preact";
import Router, { route, Route } from "preact-router";
import InstanceCreatePage from "./paths/admin/create/index.js";
import InstanceListPage from "./paths/admin/list/index.js";

export enum AdminPaths {
  list_instances = "/instances",
  new_instance = "/instance/new",
}

export function AdminRoutes(): VNode {
  return (
    <Router>
      <Route
        path={AdminPaths.list_instances}
        component={InstanceListPage}
        onCreate={() => {
          route(AdminPaths.new_instance);
        }}
        onUpdate={(id: string): void => {
          route(`/instance/${id}/update`);
        }}
      />

      <Route
        path={AdminPaths.new_instance}
        component={InstanceCreatePage}
        onBack={() => route(AdminPaths.list_instances)}
        onConfirm={() => {
          // route(AdminPaths.list_instances);
        }}

        // onError={(error: any) => {
        // }}
      />
    </Router>
  );
}
