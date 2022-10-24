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
import { format } from "date-fns";
import { h } from "preact";
import { useEffect, useState } from "preact/hooks";

interface Props {
  events: Event[];
}

export function Timeline({ events: e }: Props) {
  const events = [...e];
  events.push({
    when: new Date(),
    description: "now",
    type: "now",
  });

  events.sort((a, b) => a.when.getTime() - b.when.getTime());

  const [state, setState] = useState(events);
  useEffect(() => {
    const handle = setTimeout(() => {
      const eventsWithoutNow = state.filter((e) => e.type !== "now");
      eventsWithoutNow.push({
        when: new Date(),
        description: "now",
        type: "now",
      });
      setState(eventsWithoutNow);
    }, 1000);
    return () => {
      clearTimeout(handle);
    };
  });
  return (
    <div class="timeline">
      {events.map((e, i) => {
        return (
          <div key={i} class="timeline-item">
            {(() => {
              switch (e.type) {
                case "deadline":
                  return (
                    <div class="timeline-marker is-icon ">
                      <i class="mdi mdi-flag" />
                    </div>
                  );
                case "delivery":
                  return (
                    <div class="timeline-marker is-icon ">
                      <i class="mdi mdi-delivery" />
                    </div>
                  );
                case "start":
                  return (
                    <div class="timeline-marker is-icon is-success">
                      <i class="mdi mdi-flag " />
                    </div>
                  );
                case "wired":
                  return (
                    <div class="timeline-marker is-icon is-success">
                      <i class="mdi mdi-cash" />
                    </div>
                  );
                case "wired-range":
                  return (
                    <div class="timeline-marker is-icon is-success">
                      <i class="mdi mdi-cash" />
                    </div>
                  );
                case "refund":
                  return (
                    <div class="timeline-marker is-icon is-danger">
                      <i class="mdi mdi-cash" />
                    </div>
                  );
                case "refund-taken":
                  return (
                    <div class="timeline-marker is-icon is-success">
                      <i class="mdi mdi-cash" />
                    </div>
                  );
                case "now":
                  return (
                    <div class="timeline-marker is-icon is-info">
                      <i class="mdi mdi-clock" />
                    </div>
                  );
              }
            })()}
            <div class="timeline-content">
              <p class="heading">{format(e.when, "yyyy/MM/dd HH:mm:ss")}</p>
              <p>{e.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
export interface Event {
  when: Date;
  description: string;
  type:
    | "start"
    | "refund"
    | "refund-taken"
    | "wired"
    | "wired-range"
    | "deadline"
    | "delivery"
    | "now";
}
