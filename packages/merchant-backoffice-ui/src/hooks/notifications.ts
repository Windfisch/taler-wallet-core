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

import { useState } from "preact/hooks";
import { Notification } from "../utils/types.js";

interface Result {
  notifications: Notification[];
  pushNotification: (n: Notification) => void;
  removeNotification: (n: Notification) => void;
}

type NotificationWithDate = Notification & { since: Date };

export function useNotifications(
  initial: Notification[] = [],
  timeout = 3000,
): Result {
  const [notifications, setNotifications] = useState<NotificationWithDate[]>(
    initial.map((i) => ({ ...i, since: new Date() })),
  );

  const pushNotification = (n: Notification): void => {
    const entry = { ...n, since: new Date() };
    setNotifications((ns) => [...ns, entry]);
    if (n.type !== "ERROR")
      setTimeout(() => {
        setNotifications((ns) => ns.filter((x) => x.since !== entry.since));
      }, timeout);
  };

  const removeNotification = (notif: Notification) => {
    setNotifications((ns: NotificationWithDate[]) =>
      ns.filter((n) => n !== notif),
    );
  };
  return { notifications, pushNotification, removeNotification };
}
