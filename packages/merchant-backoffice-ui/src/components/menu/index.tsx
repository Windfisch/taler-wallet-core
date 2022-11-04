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

import { ComponentChildren, Fragment, h, VNode } from "preact";
import Match from "preact-router/match";
import { useEffect, useState } from "preact/hooks";
import { AdminPaths } from "../../AdminRoutes.js";
import { InstancePaths } from "../../InstanceRoutes.js";
import { Notification } from "../../utils/types.js";
import { NavigationBar } from "./NavigationBar.js";
import { Sidebar } from "./SideBar.js";

function getInstanceTitle(path: string, id: string): string {
  switch (path) {
    case InstancePaths.update:
      return `${id}: Settings`;
    case InstancePaths.order_list:
      return `${id}: Orders`;
    case InstancePaths.order_new:
      return `${id}: New order`;
    case InstancePaths.product_list:
      return `${id}: Products`;
    case InstancePaths.product_new:
      return `${id}: New product`;
    case InstancePaths.product_update:
      return `${id}: Update product`;
    case InstancePaths.reserves_new:
      return `${id}: New reserve`;
    case InstancePaths.reserves_list:
      return `${id}: Reserves`;
    case InstancePaths.transfers_list:
      return `${id}: Transfers`;
    case InstancePaths.transfers_new:
      return `${id}: New transfer`;
    default:
      return "";
  }
}

function getAdminTitle(path: string, instance: string) {
  if (path === AdminPaths.new_instance) return `New instance`;
  if (path === AdminPaths.list_instances) return `Instances`;
  return getInstanceTitle(path, instance);
}

interface MenuProps {
  title?: string;
  instance: string;
  admin?: boolean;
  onLogout?: () => void;
  setInstanceName: (s: string) => void;
}

function WithTitle({
  title,
  children,
}: {
  title: string;
  children: ComponentChildren;
}): VNode {
  useEffect(() => {
    document.title = `Taler Backoffice: ${title}`;
  }, [title]);
  return <Fragment>{children}</Fragment>;
}

export function Menu({
  onLogout,
  title,
  instance,
  admin,
  setInstanceName,
}: MenuProps): VNode {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Match>
      {({ path }: any) => {
        const titleWithSubtitle = title
          ? title
          : !admin
          ? getInstanceTitle(path, instance)
          : getAdminTitle(path, instance);
        const adminInstance = instance === "default";
        const mimic = admin && !adminInstance;
        return (
          <WithTitle title={titleWithSubtitle}>
            <div
              class={mobileOpen ? "has-aside-mobile-expanded" : ""}
              onClick={() => setMobileOpen(false)}
            >
              <NavigationBar
                onMobileMenu={() => setMobileOpen(!mobileOpen)}
                title={titleWithSubtitle}
              />

              {onLogout && (
                <Sidebar
                  onLogout={onLogout}
                  admin={admin}
                  mimic={mimic}
                  instance={instance}
                  mobile={mobileOpen}
                />
              )}

              {mimic && (
                <nav class="level">
                  <div class="level-item has-text-centered has-background-warning">
                    <p class="is-size-5">
                      You are viewing the instance <b>"{instance}"</b>.{" "}
                      <a
                        href="#/instances"
                        onClick={(e) => {
                          setInstanceName("default");
                        }}
                      >
                        go back
                      </a>
                    </p>
                  </div>
                </nav>
              )}
            </div>
          </WithTitle>
        );
      }}
    </Match>
  );
}

interface NotYetReadyAppMenuProps {
  title: string;
  onLogout?: () => void;
}

interface NotifProps {
  notification?: Notification;
}
export function NotificationCard({
  notification: n,
}: NotifProps): VNode | null {
  if (!n) return null;
  return (
    <div class="notification">
      <div class="columns is-vcentered">
        <div class="column is-12">
          <article
            class={
              n.type === "ERROR"
                ? "message is-danger"
                : n.type === "WARN"
                ? "message is-warning"
                : "message is-info"
            }
          >
            <div class="message-header">
              <p>{n.message}</p>
            </div>
            {n.description && (
              <div class="message-body">
                <div>{n.description}</div>
                {n.details && <pre>{n.details}</pre>}
              </div>
            )}
          </article>
        </div>
      </div>
    </div>
  );
}

export function NotYetReadyAppMenu({
  onLogout,
  title,
}: NotYetReadyAppMenuProps): VNode {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.title = `Taler Backoffice: ${title}`;
  }, [title]);

  return (
    <div
      class={mobileOpen ? "has-aside-mobile-expanded" : ""}
      onClick={() => setMobileOpen(false)}
    >
      <NavigationBar
        onMobileMenu={() => setMobileOpen(!mobileOpen)}
        title={title}
      />
      {onLogout && (
        <Sidebar onLogout={onLogout} instance="" mobile={mobileOpen} />
      )}
    </div>
  );
}
