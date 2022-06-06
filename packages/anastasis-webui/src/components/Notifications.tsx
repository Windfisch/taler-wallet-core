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

/**
 *
 * @author Sebastian Javier Marchano (sebasjm)
 */

import { h, VNode } from "preact";

export interface Notification {
  message: string;
  description?: string | VNode;
  type: MessageType;
}

export type MessageType = "INFO" | "WARN" | "ERROR" | "SUCCESS";

interface Props {
  notifications: Notification[];
  removeNotification?: (n: Notification) => void;
}

function messageStyle(type: MessageType): string {
  switch (type) {
    case "INFO":
      return "message is-info";
    case "WARN":
      return "message is-warning";
    case "ERROR":
      return "message is-danger";
    case "SUCCESS":
      return "message is-success";
    default:
      return "message";
  }
}

export function Notifications({
  notifications,
  removeNotification,
}: Props): VNode {
  return (
    <div class="block">
      {notifications.map((n, i) => (
        <article key={i} class={messageStyle(n.type)}>
          <div class="message-header">
            <p>{n.message}</p>
            {removeNotification && (
              <button
                class="delete"
                onClick={() => removeNotification && removeNotification(n)}
              />
            )}
          </div>
          {n.description && <div class="message-body">{n.description}</div>}
        </article>
      ))}
    </div>
  );
}
