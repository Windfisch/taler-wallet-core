/*
 This file is part of GNU Anastasis
 (C) 2021-2022 Anastasis SARL

 GNU Anastasis is free software; you can redistribute it and/or modify it under the
 terms of the GNU Affero General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Anastasis is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License along with
 GNU Anastasis; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import { ComponentChildren, Fragment, h, VNode } from "preact";
import Match from "preact-router/match";
import { useEffect, useState } from "preact/hooks";
import { NavigationBar } from "./NavigationBar.js";
import { Sidebar } from "./SideBar.js";

interface MenuProps {
  title: string;
}

function WithTitle({
  title,
  children,
}: {
  title: string;
  children: ComponentChildren;
}): VNode {
  useEffect(() => {
    document.title = `${title}`;
  }, [title]);
  return <Fragment>{children}</Fragment>;
}

export function Menu({ title }: MenuProps): VNode {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Match>
      {({ path }: { path: string }) => {
        const titleWithSubtitle = title; // title ? title : (!admin ? getInstanceTitle(path, instance) : getAdminTitle(path, instance))
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

              <Sidebar mobile={mobileOpen} />
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
            {n.description && <div class="message-body">{n.description}</div>}
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
      class="has-aside-mobile-expanded"
      // class={mobileOpen ? "has-aside-mobile-expanded" : ""}
      onClick={() => setMobileOpen(false)}
    >
      <NavigationBar
        onMobileMenu={() => setMobileOpen(!mobileOpen)}
        title={title}
      />
      {onLogout && <Sidebar mobile={mobileOpen} />}
    </div>
  );
}

export interface Notification {
  message: string;
  description?: string | VNode;
  type: MessageType;
}

export type ValueOrFunction<T> = T | ((p: T) => T);
export type MessageType = "INFO" | "WARN" | "ERROR" | "SUCCESS";
